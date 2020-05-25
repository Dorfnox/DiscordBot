const GuildSettingsData = require("../data-layer/GuildSettingsData");
const WaffleResponse = require("../message/WaffleResponse");
const ArgumentHandler = require("../message/ArgumentHandler");
const { isStaff, sendChannel } = require("../util/WaffleUtil");

class GuildSettingsManager {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.guildSettingsData = new GuildSettingsData();
    this.argHandler = new ArgumentHandler()
      .addCmdsForCategory("Admin", "Screwbots", (msg) => this.screwbots(msg))
      .addCmdsForCategory("Admin", "Unscrewbots", (msg) =>
        this.unscrewbots(msg)
      );
    this.ready = true;
    console.log("✅ GuildSettingsManager is ready.");
  }

  static messageConsumer(msg, args) {
    // Set context
    const { channel, guild, content, member } = msg;
    const { name: guildName } = guild;
    const { username } = msg.author;
    const ctx = { guildName, username, content, err: null };

    // Validate executability
    if (!this.ready) {
      ctx.err = `Feature is down at the moment`;
      return sendChannel(channel, { description: ctx.err }, ctx);
    } else if (!isStaff(member)) {
      ctx.err = `⚠️ Only staff members can do that!`;
      return sendChannel(channel, { description: ctx.err }, ctx);
    }

    // Collect arguments
    const parseRes = this.argHandler.parseArguments(args);
    if (!parseRes.exists) {
      return;
    }

    // Execute argument function
    parseRes
      .value(msg)
      .then((embed) => sendChannel(channel, embed, ctx))
      .catch((err) => {
        ctx.err = err;
        sendChannel(channel, { description: ctx.err }, ctx);
      });
  }

  static screwbots(msg) {
    return this.guildSettingsData
      .addBotBomberChannel(msg.guild.id, msg.channel.id)
      .then(() => {
        const title = "Congrats! Bots have been royally screwed!";
        const description =
          `WaffleBomber say :boom: **BOOM** :boom: All bot messages are set to :boom: **self-destruct** :boom: after 5 seconds from **${msg.channel.name}**.` +
          `\n\nTo undo this change, use **w unscrewbots**.\n`;
        return { title, description };
      })
      .catch((err) => {
        console.log("screwbots Err: ", err);
        throw "⚠️ Unable to hire the WaffleBomber at this time";
      });
  }

  static unscrewbots(msg) {
    return this.guildSettingsData
      .deleteBotBomberChannel(msg.guild.id, msg.channel.id)
      .then(() => {
        const title = "Congrats! Bots have been given the royalty treatment!";
        const description =
          `WaffleBomber say :boom: **No More Boom** :boom: Bot messages will no longer self-destruct in **${msg.channel.name}**` +
          `\n\nTo screw over bots again, type **w screwbots**`;
        return { title, description };
      })
      .catch((err) => {
        console.log("unscrewbots Err: ", err);
        throw "⚠️ Unable to fire the WaffleBomber at this time";
      });
  }

  static offerBotToTheWaffleBomberAsASacrifice(msg) {
    if (
      !this.ready ||
      !msg.author ||
      !msg.author.bot ||
      !msg.guild ||
      !msg.channel
    ) {
      return;
    }
    this.guildSettingsData
      .isBotBomberInChannel(msg.guild.id, msg.channel.id)
      .then((isInChannel) => {
        isInChannel ? this.removeBotMessage(msg) : null;
      })
      .catch((err) => console.log(err));
  }

  static removeBotMessage(msg) {
    let description = `:boom: :boom: :boom:\nThe **WaffleBomber** has targeted all bot messages in **${msg.channel.name}** to self-destruct after 5 seconds\n:boom: :boom: :boom:`;
    const destructFunc = () =>
      msg.delete({ timeout: 5000, reason: description }).catch((err) => {
        console.log("Failed to delete: ", err);
      });
    // If it's a waffleBot message
    if (msg.author.id === this.discordClient.user.id) {
      // Edit waffle message
      const embed =
        msg.embeds && msg.embeds[0]
          ? msg.embeds[0]
          : { description: msg.content };
      const eDescription = embed.description || "";
      let editPromise = () => Promise.resolve();
      // Avoid editing the ':boom:' message
      if (eDescription.substr(0, 6) !== ":boom:") {
        embed.description = `${eDescription}\n\n${description}\n`;
        editPromise = () => msg.edit(embed);
      }
      return editPromise()
        .then(() => destructFunc())
        .catch((err) => console.log(err));
    } else {
      new WaffleResponse()
        .setEmbeddedResponse({ description })
        .reply(msg)
        .then(() => destructFunc())
        .catch((err) => console.log(err));
    }
  }
}

module.exports = GuildSettingsManager;
