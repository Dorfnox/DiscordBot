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
    memberIds: [],
  };

  constructor() {
    super("twitchChannel");
  }

  addNotifyOnLiveChannel(TwitchUserAPIData, guildId, channelId) {
    const { id: _id } = TwitchUserAPIData;
    return this.get(
      _id,
      TwitchUserData.getDefaultTwitchUserData(TwitchUserAPIData)
    ).then((TwitchUserDBData) => {
      const guildSettings =
        TwitchUserDBData.notifyOnLive.guilds[guildId] ||
        jsonCopy(TwitchUserData.defaultGuildSettings);
      // Update Channel ID
      guildSettings.channelId = channelId;
      TwitchUserDBData.notifyOnLive.guilds[guildId] = guildSettings;
      return this.set(
        _id,
        { [`notifyOnLive.guilds.${guildId}`]: guildSettings },
        TwitchUserDBData
      );
    })
    .catch(err => {
      console.log('addNotifyOnLiveChannel | Err:', err);
      throw `⚠️ An issue occurred while enabling this channel. Please try again`;
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
}

module.exports = TwitchUserData;
