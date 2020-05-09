const ServerCacheManager = require('./ServerCacheManager');

class GuildSettingsData extends ServerCacheManager {
  static defaultGuildSettings = {
    /* 
    _id: 5eaf...,
    guildId: 68498... */
    removeBotFromChannelSet: [],
  };

  constructor() {
    super("guildSettings", GuildSettingsData.defaultGuildSettings);
  }
}

module.exports = GuildSettingsData;
