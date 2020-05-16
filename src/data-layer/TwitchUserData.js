const ServerCacheManager = require("./ServerCacheManager");
const { jsonCopy } = require("../util/WaffleUtil");

class TwitchUserData extends ServerCacheManager {
  static defaultTwitchUserData = {
    /* 
    _id: 5eaf... The Twitch User Id, */
    loginName: "",
    displayName: "",
    description: "",
    profileImageURL: "",
    offlineImageURL: "",
    notifyOnLive: {
      guilds: {},
      expiryTimestamp: 0,
    },
  };
  static defaultGuildSettings = {
    channelId: "",
    userIds: [],
  };

  constructor() {
    super("twitchChannel");
  }

  addNotifyOnLiveChannel(twitchUserData, guildId, channelId) {
    const { id: _id } = twitchUserData;
    return this.get(
      _id,
      TwitchUserData.getDefaultTwitchUserData(twitchUserData)
    ).then((twitchData) => {
      const guildSettings =
        twitchData.notifyOnLive.guilds[guildId] ||
        jsonCopy(TwitchUserData.defaultGuildSettings);
      // Update Channel ID
      guildSettings.channelId = channelId;
      twitchData.notifyOnLive.guilds[guildId] = guildSettings;
      return this.set(
        _id,
        { [`notifyOnLive.guilds.${guildId}`]: guildSettings },
        twitchData
      );
    });
  }

  static getDefaultTwitchUserData(twitchUserData) {
    const {
      id: _id,
      login: loginName,
      display_name: displayName,
      description,
      profile_image_url: profileImageURL,
      offline_image_url: offlineImageURL,
      view_count: viewCount,
    } = twitchUserData;
    return Object.assign(jsonCopy(this.defaultTwitchUserData), {
      _id,
      loginName,
      displayName,
      description,
      profileImageURL,
      offlineImageURL,
      viewCount,
    });
  }

  // deleteBotBomberChannel(guildId, channelId) {
  //   return this.get(guildId).then((guildSettingsData) => {
  //     const removeBotFromChannelSet = guildSettingsData.removeBotFromChannelSet.filter(
  //       (chId) => chId != channelId
  //     );
  //     return this.set(guildId, { removeBotFromChannelSet });
  //   });
  // }

  // isBotBomberInChannel(guildId, channelId) {
  //   return this.get(guildId).then((gsd) => {
  //     return gsd.removeBotFromChannelSet.indexOf(channelId) !== -1;
  //   });
  // }
}

module.exports = TwitchUserData;
