const Nightmare = require("nightmare");
const axios = require("axios").default;
const cheerio = require("cheerio");
const fetch = require("node-fetch");
const WaffleResponse = require("../message/WaffleResponse");
const { getSafe } = require("../util/WaffleUtil");
const {
  topFiveCacheLongevityInSeconds,
} = require("../../configWaffleBot").gats;
const { gatsLogoUrl, gatsChangeLogURL, statsUrl } = require("./GatsConstants");

class GatsRequests {
  static gatsCache = {
    highScoresData: {
      siteUrl: "https://gats.io/",
      lastRequest: 0,
      data: [],
      mutexLock: false,
    },
  };

  static requestClanStatsData(clanName) {
    const url = `https://stats.gats.io/clan/${clanName}`;
    return this._requestStatsData(url);
  }

  static requestPlayerStatsData(playerName) {
    const url = `https://stats.gats.io/${playerName}`;
    return this._requestStatsData(url);
  }

  static requestTopPlayerStatsData(url) {
    return this._loadCheerioData(url).then((cdata) => {
      // Collect Title
      const title = `Players | ${cdata("#normalMenu a.active").text().trim()}`;

      // Collect Top / Highest / Longest Stats
      const stats = cdata(
        `#pageContainer > div > div.col-xs-12.col-sm-8.col-md-8 > table > tbody > tr`
      )
        .map((_, elem) => {
          const rank = getSafe(
            () => elem.children[1].children[0].data.trim(),
            "?"
          );
          const tempNames = getSafe(
            () =>
              elem.children[3].children[1].children[0].data.trim().split("\n"),
            "unknown"
          );
          const username = getSafe(
            () => tempNames[tempNames.length - 1],
            "unknown"
          );
          const clanName = getSafe(
            () =>
              tempNames.length > 1 ? tempNames[0].replace(/[\[\]]+/g, "") : "",
            "unknown"
          );
          const hasClan = clanName.length > 0;
          const score = getSafe(
            () => elem.children[5].children[0].data.trim(),
            "unknown"
          );
          const isVip = getSafe(
            () =>
              elem.children[3].children[3].attribs.class === "vip-logo-small",
            false
          );
          return { rank, username, clanName, hasClan, score, isVip };
        })
        .get();

      return { title, url, stats };
    });
  }

  static requestTopClanStatsData(url) {
    return this._loadCheerioData(url).then((cdata) => {
      // Collect Title
      const title = `Clans | ${cdata("#dropdownMenu1").text().trim()}`;

      // Collect Clan Stats
      const stats = cdata(
        `#pageContainer > div > div.col-xs-12.col-sm-8.col-md-8 > table > tbody > tr`
      )
        .map((_, elem) => {
          const rank = getSafe(
            () => elem.children[1].children[0].data.trim(),
            "?"
          );
          const tag = getSafe(
            () => elem.children[3].children[0].data.trim(),
            "?"
          );
          const clanName = getSafe(
            () => elem.children[5].children[1].children[0].data.trim(),
            "?"
          );
          const members = getSafe(
            () => elem.children[7].children[0].data.trim(),
            "?"
          );
          const score = getSafe(
            () => elem.children[9].children[0].data.trim(),
            "?"
          );
          return { rank, tag, clanName, members, score };
        })
        .get();

      return { title, url, stats };
    });
  }

  static requestChangeLog() {
    return this._loadCheerioData(gatsChangeLogURL)
      .then((cdata) => {
        const date = cdata("#pageContainer > div > div > div > b:nth-child(2)")
          .text()
          .trim();
        const changes = cdata(
          "#pageContainer > div > div > div > ul:nth-child(4) > li"
        )
          .map((_, elem) => getSafe(() => elem.children[0].data.trim(), "?"))
          .get();
        const url = gatsChangeLogURL;
        return { date, changes, url };
      })
      .catch((err) => {
        console.log("_requestChangeLog Err: ", err);
        throw "⚠️ Unable to request change-log data";
      });
  }

  static requestGatsServers() {
    return fetch("https://io-8.com/find_instances", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        "sec-ch-ua":
          '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
      },
      referrer: "https://gats.io/",
      referrerPolicy: "strict-origin-when-cross-origin",
      body: '{"game":"gats.io"}',
      method: "POST",
      mode: "cors",
    })
      .then((res) => res.json())
      .then((json) => {
        let servers = json;
        let serverData = servers.map(
          (server) =>
            server.city +
            " " +
            server.game_type +
            ": " +
            server.players +
            " online"
        );
        return serverData;
      });
  }

  static requestTopFiveData() {
    const now = Date.now();
    const { lastRequest, siteUrl, mutexLock } = this.gatsCache.highScoresData;
    // Only update cache if it's been more than the longevity of the cache config. Default to 120 seconds.
    if (
      !mutexLock &&
      now - lastRequest >
        Math.max(0, (topFiveCacheLongevityInSeconds || 120) * 1000)
    ) {
      // Lock further spam requests
      this.gatsCache.highScoresData.mutexLock = true;

      // Open site
      return Nightmare({ show: false, gotoTimeout: 15000, waitTimeout: 15000 })
        .goto(siteUrl)
        .wait("#hsd > div:nth-child(5) > div.high-scores-text")
        .evaluate(() => document.getElementById("hsd").innerHTML)
        .end()
        .then((html) => {
          const cdata = cheerio.load(html, { normalizeWhitespace: true });
          const data = cdata(".high-score-row")
            .map((_, elem) => {
              const isVip = elem.children[0].children[0] ? true : false;
              const position = `${_ + 1}`;
              const [
                player,
                points,
              ] = elem.children[1].children[0].data.trim().split(": ");
              return { isVip, position, player, points };
            })
            .get();

          // Request player stats
          const playerRequestArray = data.map((d) =>
            this.requestPlayerStatsData(d.player)
          );
          return Promise.all(playerRequestArray).then((values) => {
            // Add playerStats data to return
            values.forEach((v, idx) => {
              data[idx].playerStats = v;
            });
            // Update Cache
            this.gatsCache.highScoresData.lastRequest = now;
            this.gatsCache.highScoresData.data = data;
            return data;
          });
        })
        .catch((err) => {
          // Log error
          new WaffleResponse()
            .setErrorLocale("requestTopFiveData")
            .setError(err)
            .reply();
          return [];
        })
        .finally(() => {
          // Unlock mutex
          this.gatsCache.highScoresData.mutexLock = false;
        });
    }
    // If cache update interval has not been reached yet, or there is a mutex lock in place.
    return Promise.resolve(this.gatsCache.highScoresData.data);
  }

  static _loadCheerioData(url) {
    return axios
      .get(url)
      .then((response) => response.data)
      .then((data) => cheerio.load(data, { normalizeWhitespace: true }))
      .catch((err) => {
        console.log("_loadCheerioData Err:", err);
        throw "⚠️ Unable to request / load data for cheerio";
      });
  }

  static _requestStatsData(url) {
    const isPlayer = !url.startsWith(`${statsUrl}clan/`);
    return this._loadCheerioData(url)
      .then((cdata) => {
        const vipSelector = `#pageContainer > h1`;
        const nameSelector = (nthChild) =>
          `#pageContainer > div:nth-child(${nthChild}) > div:nth-child(1) > h1`;
        const clanNameSelector = (nthChild) =>
          `#pageContainer > div:nth-child(${nthChild}) > div:nth-child(1) > h2`;
        const statsSelector = (nthChild, tableNum = 1) =>
          `#pageContainer > div:nth-child(${nthChild}) > div:nth-child(${tableNum}) > table > tbody > tr`;
        const favoriteLoadoutsSelector = (nthChild) =>
          `#pageContainer > div:nth-child(${nthChild}) > div:nth-child(2) > div > table > tbody > tr`;

        // Collect vip details
        let vip = null;
        if (isPlayer) {
          vip = getSafe(
            () => {
              const vipData = cdata(vipSelector)
                .text()
                .trim()
                .split("\n")
                .filter((t) => t !== "");
              let isVip = false;
              let since = null;
              if (vipData.length === 2 && vipData[0] === "Premium Member") {
                isVip = true;
                since = vipData[1].substring(6);
              }
              return { isVip, since };
            },
            { isVip: false, since: null }
          );
        }

        const nthChild = vip && vip.isVip ? 3 : 1;

        // Collect proper name
        const name = getSafe(
          () => cdata(nameSelector(nthChild)).text().trim().split(" ")[0],
          "unknown"
        );

        // Collect clan name/link
        let clan = null;
        if (isPlayer) {
          clan = getSafe(
            () => {
              const clanLoad = cdata(clanNameSelector(nthChild));
              const name = clanLoad.children().get(0).children[0].data.trim();
              const link = `${statsUrl}${clanLoad
                .find("a")
                .attr("href")
                .substring(1)}`;
              return { name, link };
            },
            { name: null, link: null }
          );
        }

        const statIterator = (_, elem) => {
          const stat = getSafe(
            () => elem.children[1].children[0].data.trim(),
            "no stat"
          );
          const value = getSafe(
            () => elem.children[3].children[0].data.trim(),
            "no value"
          );
          return { stat, value };
        };

        const stats = cdata(statsSelector(nthChild)).map(statIterator).get();

        const weaponStatNthChild = isPlayer && !vip.isVip ? 4 : 7;
        const weaponStats = {
          pistol: cdata(statsSelector(weaponStatNthChild, 1))
            .map(statIterator)
            .get(),
          smg: cdata(statsSelector(weaponStatNthChild, 2))
            .map(statIterator)
            .get(),
          shotgun: cdata(statsSelector(weaponStatNthChild, 3))
            .map(statIterator)
            .get(),
          assault: cdata(statsSelector(weaponStatNthChild, 4))
            .map(statIterator)
            .get(),
          sniper: cdata(statsSelector(weaponStatNthChild, 5))
            .map(statIterator)
            .get(),
          lmg: cdata(statsSelector(weaponStatNthChild, 6))
            .map(statIterator)
            .get(),
        };

        // Collect Favorite Loadouts
        const favoriteLoadouts = cdata(favoriteLoadoutsSelector(nthChild))
          .map((_, elem) => {
            const stat = getSafe(
              () => elem.children[1].children[1].children[0].data.trim(),
              "no stat"
            );
            const value = getSafe(
              () => elem.children[1].children[3].children[0].data.trim(),
              "no value"
            );
            const imageUrl = getSafe(
              () =>
                `https://stats.gats.io${elem.children[3].children[0].attribs.src.trim()}`,
              gatsLogoUrl
            );
            return { stat, value, imageUrl };
          })
          .get();
        return { url, name, clan, stats, weaponStats, favoriteLoadouts, vip };
      })
      .catch((err) => {
        console.log("_requestStatsData Err: ", url, err);
        throw "⚠️ Unable to request stats data";
      });
  }
}

module.exports = GatsRequests;
