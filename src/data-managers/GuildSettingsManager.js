const GuildSettingsData = require("../data-layer/GuildSettingsData");
const WaffleResponse = require("../message/WaffleResponse");
const {
  addValueToMapSet,
  deleteValueFromMapSet,
  isStaff,
} = require("../util/WaffleUtil");

class GuildSettingsManager {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.guildSettingsData = new GuildSettingsData();
    this.ready = true;
  }

  static screwbots(msg) {
    if (!this._verifyExecuteability(msg)) {
      return;
    }
    this.guildSettingsData
      .addBotBomberChannel(msg.guild.id, msg.channel.id)
      .then(() => {
        const title = "Congrats! Bots have been royally screwed!";
        const description =
          `WaffleBomber say :boom: **BOOM** :boom: All bot messages are set to :boom: **self-destruct** :boom: after 5 seconds from **${msg.channel.name}**.` +
          `\n\nTo undo this change, use **w unscrewbots**.\n`;
        new WaffleResponse()
          .setEmbeddedResponse({ title, description })
          .reply(msg);
      })
      .catch((err) => {
        const description = err.message ? err.message : err;
        new WaffleResponse()
          .setError(err)
          .setEmbeddedResponse({ description })
          .reply(msg);
      });
  }

  static unscrewbots(msg) {
    if (!this._verifyExecuteability(msg)) {
      return;
    }
    this.guildSettingsData
      .deleteBotBomberChannel(msg.guild.id, msg.channel.id)
      .then(() => {
        const title = "Congrats! Bots have been given the royalty treatment!";
        const description =
          `WaffleBomber say :boom: **No More Boom** :boom: Bot messages will no longer self-destruct in **${msg.channel.name}**` +
          `\n\nTo screw over bots again, type **w screwbots**`;
        new WaffleResponse()
          .setEmbeddedResponse({ title, description })
          .reply(msg);
      })
      .catch((err) => {
        const description = err.message ? err.message : err;
        new WaffleResponse()
          .setError(err)
          .setEmbeddedResponse({ description })
          .reply(msg);
      });
  }

  static shouldRemoveMsg(msg) {
    if (
      !this.ready ||
      !msg.author ||
      !msg.author.bot ||
      !msg.guild ||
      !msg.channel
    ) {
      return Promise.resolve(false);
    }
    return this.guildSettingsData.isBotBomberInChannel(
      msg.guild.id,
      msg.channel.id
    );
  }

  static removeBotMessage(msg) {
    let description = `:boom: :boom: :boom:\nThe **WaffleBomber** has targeted all bot messages in **${msg.channel.name}** to self-destruct after 5 seconds\n:boom: :boom: :boom:`;
    const destructFunc = () =>
      msg.delete({ timeout: 5000, reason: description }).catch((err) => {
        console.log("Failed to delete: ", err);
      });
    if (msg.author.id === this.discordClient.user.id) {
      // Edit waffle message
      const embed =
        msg.embeds && msg.embeds[0]
          ? msg.embeds[0]
          : { description: msg.content };
      let editPromise = () => Promise.resolve();
      if (embed.description.substr(0, 6) !== ":boom:") {
        embed.description = `${
          embed.description ? embed.description : ""
        }\n\n${description}\n`;
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

  static _verifyExecuteability(msg) {
    if (!this.ready) {
      new WaffleResponse()
        .setEmbeddedResponse({ description: `Feature is down at the moment` })
        .reply(msg);
      return false;
    } else if (!isStaff(msg.member)) {
      new WaffleResponse()
        .setEmbeddedResponse({ description: `Only staff can do that!` })
        .reply(msg);
      return false;
    }
    return true;
  }
}

module.exports = GuildSettingsManager;
