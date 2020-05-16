const TwitchUserData = require("../data-layer/TwitchUserData");
const TwitchHelix = require("../data-layer/TwitchHelix");
const WaffleResponse = require("../message/WaffleResponse");
const ArgumentHandler = require("../message/ArgumentHandler");
const { isStaff } = require("../util/WaffleUtil");

class TwitchChannelManager {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.twitchUserData = new TwitchUserData();
    this.ready = true;
    this.argMap = new ArgumentHandler().addCmds(
      ["twitch enable", "enable twitch"],
      (msg, channelArg) => this.enableTwitchNotifications(msg, channelArg)
    );
  }

  /* ~~~ ~~~ ~~~ ~~~ Consumes commands from Discord ~~~ ~~~ ~~~ ~~~ */
  static messageConsumer(msg, args) {
    if (!this.ready || true) {
      new WaffleResponse()
        .setEmbeddedResponse({ description: `Feature is down at the moment` })
        .reply(msg);
      return;
    }
    const parseRes = this.argMap.parseArguments(args);
    if (!parseRes.exists) {
      return;
    }
    const channelArg = ArgumentHandler.removeArgs(args, parseRes.parseLength);
    parseRes
      .value(msg, channelArg)
      .then((res) => {
        if (res) {
          new WaffleResponse()
            .setEmbeddedResponse({ description: res })
            .reply(msg);
        }
      })
      .catch((err) => {
        console.log("errrr", err);
        if (err) {
          new WaffleResponse()
            .setEmbeddedResponse({ description: err })
            .reply(msg);
        }
      });
  }

  static enableTwitchNotifications(msg, channelArg) {
    if (!isStaff(msg.member)) {
      return Promise.resolve(
        `🚫 You must be a staff member to enable/disable twitch notifications.`
      );
    } else if (!channelArg) {
      return Promise.resolve(
        `⚠️ Please provide the **twitch url** or **channel username** of the twitch streamer to enable/disable notifications for.`
      );
    }
    const { guild, channel } = msg;
    // 1. Get twitch user data via api
    return TwitchHelix.getTwitchUserFromChannelNameOrURL(channelArg).then(
      (channelData) => {
        if (!channelData) {
          return `⚠️ No user found for **${channelArg}**. Did you spell that correctly?\nYou can give me either the **twitch url**, or the **channel username** of the streamer.`;
        }
        // TODO
        return this.twitchUserData
          .addNotifyOnLiveChannel(channelData, guild.id, channel.id)
          .then((twitchChannelData) => {
            return TwitchHelix.subscribeToTwitchUserNotification(
              twitchChannelData._id
            ).then(() => {
              const description = `✅ You have enabled twitch notifiications for ${twitchChannelData.displayName}`;
              new WaffleResponse().setEmbeddedResponse({ description }).reply(msg);
            });
          });
      }
    );
    // 1. Check cache if we have twitch enabled for that
  }

  static _toggleTwitchNotifications(msg, channelArg) {}

  /* ~~~ ~~~ ~~~ ~~~ Consumes webhook calls from Twitch API | /twitch/notify_on_live ~~~ ~~~ ~~~ ~~~ */

  static notifyOnLiveWebhookConsumer(req) {
    console.log("REQ:", req);
  }
}

module.exports = TwitchChannelManager;
