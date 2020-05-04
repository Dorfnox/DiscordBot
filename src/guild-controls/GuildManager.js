const WaffleMongo = require("../data-layer/WaffleMongo");
const WaffleResponse = require("../message/WaffleResponse");
const {
  addValueToMapSet,
  deleteValueFromMapSet,
  isStaff,
} = require("../util/WaffleUtil");

class GuildManager {
  static ready = false;
  static discordClient = null;
  static guildSettings = null;
  static guildToServerRemoveBotSetMap = new Map(); // Map of guildId -> Set of ChannelIds

  static init(discordClient) {
    GuildManager.discordClient = discordClient;
    GuildManager.guildSettings = new WaffleMongo("guildSettings");
    const defaultGuildSettings = {
      /* 
      _id: 5eaf...,
      guildId: 68498... */
      removeBotFromChannelSet: [],
    };
    // Initialize each connected guild with default settings
    const guildInsertArray = GuildManager.discordClient.guilds.cache.map(
      (g) => {
        const { id: guildId } = g;
        return GuildManager.guildSettings.insertOneIfNotExists(
          { guildId },
          { guildId, ...defaultGuildSettings }
        );
      }
    );
    // Update internal Maps with server settings
    return Promise.all(guildInsertArray)
      .then((_) =>
        GuildManager.guildSettings.find({
          removeBotFromChannelSet: { $exists: true, $ne: [] },
        })
      )
      .then((guildSettingsArray) => {
        guildSettingsArray.forEach(({ guildId, removeBotFromChannelSet }) => {
          removeBotFromChannelSet.forEach((channelId) => {
            addValueToMapSet(
              GuildManager.guildToServerRemoveBotSetMap,
              guildId,
              channelId
            );
          });
        });
      })
      .then(() => {
        GuildManager.ready = true;
      })
      .catch((err) => {
        console.log("GuildManager failed to init: ", err);
        throw err;
      });
  }

  static screwbots(msg) {
    if (!GuildManager.ready) {
      return;
    }
    GuildManager._verifyIsStaff(msg.member)
      .then(() =>
        GuildManager._addRemoveBotChannelSetting(msg.guild.id, msg.channel.id)
      )
      .then(() => {
        const title = "Congrats! Bots have been royally screwed!";
        const description =
          `All bot messages will now :bomb: **self-destruct** :bomb: after 5 seconds from #${msg.channel.name}.` +
          `\nTo undo this change, please type **w unscrewbots**.\n` +
          `\n\n*This has been a message from your friendly neighborhood bomber-bot.* ***Goodbye!***`;
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
    if (!GuildManager.ready) {
      return;
    }
    GuildManager._verifyIsStaff(msg.member)
      .then(() =>
        GuildManager._deleteRemoveBotChannelSetting(
          msg.guild.id,
          msg.channel.id
        )
      )
      .then(() => {
        const title = "Congrats! Bots have been given the royalty treatment!";
        const description =
          `Bot messages will no longer self-destruct in #${msg.channel.name}.` +
          `\nTo screw over bots again, type **w screwbots**.\n` +
          `\n\n*This has been a message from your friendly neighborhood bomber-bot.* ***Goodbye!***`;
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
    if (!msg.author || !msg.author.bot || !msg.guild || !msg.channel) {
      return false;
    }
    return (
      GuildManager.guildToServerRemoveBotSetMap.has(msg.guild.id) &&
      GuildManager.guildToServerRemoveBotSetMap
        .get(msg.guild.id)
        .has(msg.channel.id)
    );
  }

  static removeBotMessage(msg) {
    let description = `:bomb: ***IMPORTANT:*** *Bots* have been **removed** from ${msg.channel.name}. Bot messages will self-destruct in 5 seconds :bomb:`;
    const destructFunc = () =>
      msg.delete({ timeout: 5000, reason: description }).catch((err) => {
        console.log("Failed to delete: ", err);
      });
    if (msg.author.id === GuildManager.discordClient.user.id) {
      // Edit waffle message
      const embed =
        msg.embeds && msg.embeds[0]
          ? msg.embeds[0]
          : { description: msg.content };
      let editPromise = () => Promise.resolve();
      if (embed.description.substr(0, 6) !== ":bomb:") {
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

  static _addRemoveBotChannelSetting(guildId, channelId) {
    return GuildManager.guildSettings
      .updateOne(
        { guildId },
        { $addToSet: { removeBotFromChannelSet: channelId } }
      )
      .then(() => {
        addValueToMapSet(
          GuildManager.guildToServerRemoveBotSetMap,
          guildId,
          channelId
        );
      })
      .catch((err) => {
        console.log("Failed to _addRemoveBotChannelSetting: ", err);
        throw err;
      });
  }

  static _deleteRemoveBotChannelSetting(guildId, channelId) {
    return GuildManager.guildSettings
      .updateOne({ guildId }, { $pull: { removeBotFromChannelSet: channelId } })
      .then(() => {
        deleteValueFromMapSet(
          GuildManager.guildToServerRemoveBotSetMap,
          guildId,
          channelId
        );
      })
      .catch((err) => {
        console.log("Failed to _removeRemoveBotChannelSetting: ", err);
        throw err;
      });
  }

  static _verifyIsStaff(guildMember) {
    return new Promise((resolve, reject) =>
      isStaff(guildMember) ? resolve() : reject("*Only admins can do that!*")
    );
  }
}

module.exports = GuildManager;
