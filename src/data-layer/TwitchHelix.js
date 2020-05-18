const axios = require("axios").default;
const { getSafe } = require("../util/WaffleUtil");
const { twitchApp, publicIP } = require("../../configWaffleBot");

const { clientId, clientSecret } = twitchApp;
const { address: publicIPAddress, port } = publicIP;

class TwitchHelix {
  static appAccess = {
    accessToken: null,
    expiresAt: null, // Time in seconds
    headers: {
      "Client-ID": clientId,
      Authorization: null,
    },
  };
  static oAuthEndpoint = `https://id.twitch.tv/oauth2/`;
  static helixEndpoint = `https://api.twitch.tv/helix/`;

  static getToken() {
    if (
      this.appAccess.expiresAt &&
      this.appAccess.expiresAt > Date.now() + 5000
    ) {
      return Promise.resolve();
    }
    return this.refreshToken();
  }

  static refreshToken() {
    return axios
      .post(
        `${this.oAuthEndpoint}token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`
      )
      .then((response) => {
        const { status, data } = response;
        if (status !== 200) {
          throw `TwitchHelix | RefreshToken: Status is not 200: ${status}`;
        }
        // Update access token
        this.appAccess.accessToken = data.access_token;
        this.appAccess.expiresAt = Date.now() + data.expires_in * 1000;
        this.appAccess.headers.Authorization = `Bearer ${data.access_token}`;
      })
      .catch((err) => {
        console.log(err);
        throw "TwitchHelix | RefreshToken: failed to aquire authentication token";
      });
  }

  static getTwitchUserFromChannelNameOrURL(channelName) {
    const twitchUserRegex = /^(https:\/\/www.twitch.tv\/){0,1}([^\/]+)\/{0,1}$/;
    channelName = getSafe(() => channelName.match(twitchUserRegex)[2]);
    if (!channelName) {
      throw `⚠️ Please provide a sreamer's **twitch link** or their **username**`;
    }
    const url = `${this.helixEndpoint}users?login=${channelName}`;
    return (
      this._axiosRequest("get", url)
        // response.data.data will be an empty array if provided user doesn't exist
        .then((response) => {
          const userData = response.data.data[0];
          if (!userData) {
            throw "No user data found";
          }
          return userData;
        })
        .catch(() => {
          throw (
            `⚠️ An error occurred while retrieving twitch user data for **${channelName}**.\n\n` +
            `Try supplying the twitch streamer's **home url** or their **channel username**.\n` +
            `If you continue experiencing this issue, this may be a problem with the bot.`
          );
        })
    );
  }

  static subscribeToTwitchUserNotification(twitchUserId) {
    const url = `${this.helixEndpoint}webhooks/hub`;
    const topic = `${this.helixEndpoint}streams?user_id=${twitchUserId}`;
    const callback = `http://${publicIPAddress}:${port}/twitch/notify_on_live/${twitchUserId}`;
    const data = {
      "hub.mode": "subscribe",
      "hub.callback": callback,
      "hub.topic": topic,
      "hub.lease_seconds": 864000, // 10 days (max)
    };
    return this._axiosRequest("post", url, { data })
      .then((response) => {
        if (response.status !== 202) {
          console.log(
            `⚠️ Error subscribing to twitch user ${twitchUserId}! ${response.status}, ${response.statusText}`
          );
          throw "Bad response status";
        }
      })
      .catch(() => {
        throw "⚠️ Failed to subscribe to twitch user notifications";
      });
  }

  static _axiosRequest(method, url, options = {}) {
    const axiosRequest = () =>
      axios({
        headers: this.appAccess.headers,
        method,
        url,
        ...options,
      });
    return this.getToken()
      .then(() => axiosRequest())
      .catch((err) => {
        // TODO: Check if err is due to token, retry once
        if (false) {
          return this.refreshToken().then(() => axiosRequest());
        }
        console.log("_axiosRequest | Error:", method, url, options, err);
        throw `_axiosRequest failed to perform for: ${method}, ${url}, ${options}`;
      });
  }
}

// TwitchHelix.getTwitchUserFromChannelNameOrURL("https://www.twitch.tv/");

module.exports = TwitchHelix;
