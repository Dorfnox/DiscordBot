const TwitchUserData = require("../data-layer/TwitchUserData");
const TwitchHelix = require("../data-layer/TwitchHelix");
const WaffleResponse = require("../message/WaffleResponse");
const ArgumentHandler = require("../message/ArgumentHandler");
const {
  isStaff,
  sendChannel,
  zeroWidthSpaceChar: z,
} = require("../util/WaffleUtil");

class TwitchChannelManager {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.twitchUserData = new TwitchUserData();
    this.ready = true;
    this.argMap = new ArgumentHandler()
      .addCmdsForCategory(
        "3rdPartyIntegrations",
        "Twitch Enable",
        (msg, channelArg) => this.enableTwitchNotifications(msg, channelArg)
      )
      .addCmdsForCategory(
        "3rdPartyIntegrations",
        "Twitch Disable",
        (msg, channelArg) => this.enableTwitchNotifications(msg, channelArg)
      );
  }

  /* ~~~ ~~~ ~~~ ~~~ Consumes commands from Discord ~~~ ~~~ ~~~ ~~~ */
  static messageConsumer(msg, args) {
    // Initialize context
    const { guild, channel, author, content } = msg;
    const { name: guildName } = guild;
    const { username } = author;
    const ctx = { guildName, username, content, err: null };

    // Validate executability
    if (!this.ready) {
      ctx.err = `Feature is down at the moment`;
      return sendChannel(channel, { description: ctx.err }, ctx);
    }

    // Collect arguments
    const parseRes = this.argMap.parseArguments(args);
    if (!parseRes.exists) {
      return;
    }

    // Execute argument function
    parseRes
      .value(msg, ArgumentHandler.removeArgs(args, parseRes.parseLength))
      .catch((description) => {
        console.log(description);
        ctx.err = description;
        return description;
      })
      .then((description) => {
        if (description) {
          sendChannel(channel, { description }, ctx);
        }
      });
  }

  static enableTwitchNotifications(msg, channelArg) {
    const { guild, channel, member } = msg;
    if (!isStaff(member)) {
      return Promise.reject(
        `🚫 You must be a staff member to enable/disable twitch notifications.`
      );
    } else if (!channelArg) {
      return Promise.reject(
        `⚠️ Please provide the **twitch url** or **channel username** of the twitch streamer to enable/disable notifications for.`
      );
    }
    return this._enableTwitchNotifications(guild, channel, channelArg);
  }

  static _enableTwitchNotifications(guild, channel, twitchUserArgstring) {
    // 1.  Call Twitch API to get user data
    return TwitchHelix.getTwitchUserFromChannelNameOrURL(twitchUserArgstring)
      .then((TwitchUserAPIData) =>
        // 2. Add guild/channel to database for notifications
        this.twitchUserData.addNotifyOnLiveChannel(
          TwitchUserAPIData,
          guild.id,
          channel.id
        )
      )
      .then((TwitchUserDBData) =>
        // 3. Call Twitch API to initialze webhook
        TwitchHelix.subscribeToTwitchUserNotification(
          TwitchUserDBData._id
        ).then(
          () =>
            `✅ You have enabled twitch notifiications for ${TwitchUserDBData.displayName}`
        )
      );
    // 1. Check cache if we have twitch enabled for that
  }

  /* ~~~ ~~~ ~~~ ~~~ Consumes webhook calls from Twitch API | /twitch/notify_on_live ~~~ ~~~ ~~~ ~~~ */

  static notifyOnLiveWebhookConsumer(twitchUserId) {
    // Could potentially receive a webhook while server boots up
    if (!this.ready) {
      return;
    }
    this.twitchUserData
      .get(twitchUserId)
      .then((twitchUser) => {
        // Get guilds to notify
        const guildsToClean = new Set();
        const membersToClean = new Map(); // Map of guildId -> Set<MemberIds>;
        const { guilds, expiryTimestamp } = twitchUser.notifyOnLive;

        // TODO: If expiryTimestamp is almost up, then refresh the webhook.

        Object.entries(guilds).forEach(([guildId, notifiables]) => {
          const guild = this.discordClient.guilds.resolve(guildId);
          // Check that guild still exists
          if (!guild || guild.deleted) {
            return guildsToClean.add(guildId);
          }
          // Check that channel still exists
          const { channelId, memberIds } = notifiables;
          const channel = guild.channels.resolve(channelId);
          if (!channel || channel.deleted) {
            return guildsToClean.add(guildId);
          }
          // Notify Channel / Users
          const {
            displayName,
            loginName,
            profileImageURL,
            description,
          } = twitchUser;
          const mentions = memberIds
            .filter((mid) => {
              // If member is no longer in channel, clean them up
              if (!channel.members.has(mid)) {
                const guildMembersToClean =
                  membersToClean.get(guildId) || new Set();
                guildMembersToClean.add(mid);
                membersToClean.set(guildId, guildMembersToClean);
                return false;
              }
              return true;
            })
            .map((mid) => {
              `<@${mid}>`;
            })
            .join(", ");
          const embed = {
            author: {
              name: `Twitch | ${displayName}`,
              url: `https://www.twitch.tv/${loginName}`,
              icon_url: `https://is4-ssl.mzstatic.com/image/thumb/Purple123/v4/c7/92/38/c79238a6-f4b0-4bfb-1046-b6ad412ce12a/TwitchAppIcon-1x_U007emarketing-0-7-0-0-85-220.png/246x0w.png`,
            },
            thumbnail: {
              url: profileImageURL,
            },
            url: `https://www.twitch.tv/${loginName}`,
            title: `${displayName} is now **livestreaming**! Click here to join the stream.`,
            description: `${description}\n${mentions}\n${z}`,
            fields: [
              {
                name: "Enable/Disable notifications (staff only)",
                value: `\`w twitch enable/disable ${loginName}\``,
              },
              // {
              //   name: "Add yourself to direct mentions",
              //   value: `\`w twitch mentionme ${loginName}\``
              // }
            ],
          };
          const { name: guildName } = guild;
          const content = `notifyOnLiveWebhookConsumer: ${embed.title}`;
          sendChannel(channel, embed, { guildName, content });
        });
        // TODO: Clean up Guilds AND Members
      })
      .catch((err) => {
        console.log("notifyOnLiveWebhookConsumer | Could not get db ");
      });
  }
}

module.exports = TwitchChannelManager;
