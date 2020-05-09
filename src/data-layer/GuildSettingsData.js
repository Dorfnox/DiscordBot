const ServerCacheManager = require("./ServerCacheManager");

class GuildSettingsData extends ServerCacheManager {
  static defaultGuildSettingsData = {
    /* 
    _id: 5eaf...,
    guildId: 68498... */
    removeBotFromChannelSet: [],
  };

  constructor() {
    super("guildSettings", GuildSettingsData.defaultGuildSettingsData);
  }

  addBotBomberChannel(guildId, channelId) {
    return this.get(guildId).then((guildSettingsData) => {
      console.log("Initial Get", guildSettingsData);
      const { removeBotFromChannelSet } = guildSettingsData;
      if (removeBotFromChannelSet.indexOf(channelId) === -1) {
        removeBotFromChannelSet.push(channelId);
      }
      return this.set(guildId, { removeBotFromChannelSet });
    });
  }

  deleteBotBomberChannel(guildId, channelId) {
    return this.get(guildId).then((guildSettingsData) => {
      const removeBotFromChannelSet = guildSettingsData.removeBotFromChannelSet.filter(
        (chId) => chId != channelId
      );
      return this.set(guildId, { removeBotFromChannelSet });
    });
  }

  isBotBomberInChannel(guildId, channelId) {
    return this.get(guildId).then((gsd) => {
      return gsd.removeBotFromChannelSet.indexOf(channelId) !== -1;
    });
  }
}

module.exports = GuildSettingsData;
