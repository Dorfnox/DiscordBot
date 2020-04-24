const Nightmare = require('nightmare');
const axios = require('axios').default;
const cheerio = require('cheerio');

const WaffleResponse = require('../message/WaffleResponse');
const { getSafe } = require('../util/WaffleUtil');
const { topFiveCacheLongevityInSeconds } = require('../../configWaffleBot').gats;
const { gatsLogoUrl } = require('./GatsConstants');


class GatsRequests {
  static gatsCache = {
    highScoresData: {
      siteUrl: "https://gats.io/",
      lastRequest: 0,
      data: []
    }
  };

  static requestClanStatsData(clanName) {
    const url = `https://stats.gats.io/clan/${clanName}`;
    return GatsRequests._requestStatsData(url);
  }

  static requestPlayerStatsData(playerName) {
    const url = `https://stats.gats.io/${playerName}`;
    return GatsRequests._requestStatsData(url);
  }

  static requestTopClanStatsData() {
    const url = `https://stats.gats.io/clans/top`;
    return GatsRequests._loadCheerioData(url)
      .then(cdata => {
        // Collect Title
        const title = cdata('#normalMenu a.active').text();

        // Collect Clan Stats
        const stats = cdata(`#pageContainer > div > div.col-xs-12.col-sm-8.col-md-8 > table > tbody > tr`).map((_, elem) => {
          const rank = getSafe(() => elem.children[1].children[0].data.trim(), '?');
          const tag = getSafe(() => elem.children[3].children[0].data.trim(), '?');
          const clanName = getSafe(() => elem.children[5].children[1].children[0].data.trim(), '?');
          const members = getSafe(() => elem.children[7].children[0].data.trim(), '?');
          const score = getSafe(() => elem.children[9].children[0].data.trim(), '?');
          return { rank, tag, clanName, members, score };
        }).get();

        return { title, url, stats };
      });
  }

  static requestTopPlayerStatsData(url) {
    return GatsRequests._loadCheerioData(url)
      .then(cdata => {
        // Collect Title
        const title = cdata('#normalMenu a.active').text();

        // Collect Top / Highest / Longest Stats
        const stats = cdata(`#pageContainer > div > div.col-xs-12.col-sm-8.col-md-8 > table > tbody > tr`).map((_, elem) => {
          const rank = getSafe(() => elem.children[1].children[0].data.trim(), '?');
          const tempNames = getSafe(() => elem.children[3].children[1].children[0].data.trim().split('\n'), 'unknown');
          const username = getSafe(() => tempNames[tempNames.length - 1], 'unknown');
          const clanName = getSafe(() => tempNames.length > 1 ? tempNames[0].replace(/[\[\]]+/g, '') : '', 'unknown');
          const hasClan = clanName.length > 0;
          const score = getSafe(() => elem.children[5].children[0].data.trim(), 'unknown');
          return { rank, username, clanName, hasClan, score };
        }).get();

        return { title, url, stats };
      });
  }

  static requestTopFiveData() {
    const now = Date.now();
    const { lastRequest, siteUrl } = GatsRequests.gatsCache.highScoresData;
    // Only update cache if it's been more than the longevity of the cache config. Default to 120 seconds.
    if (now - lastRequest > Math.max(0, (topFiveCacheLongevityInSeconds || 120) * 1000)) {
      return Nightmare({ show: false, gotoTimeout: 15000, waitTimeout: 15000 })
        .goto(siteUrl)
        .wait("#highScoresData#highScoresData > br:nth-child(5)")
        .evaluate(() => document.getElementById("highScoresData").innerText)
        .end()
        .then(text => {
          let data = text.split("\n");
          data.shift();
          data = data.map(row => {
            const elems = row.split(" ");
            return {
              position: elems[0][0],
              player: elems[1].slice(0, -1),
              points: elems[2],
            };
          });
          // Update Cache
          GatsRequests.gatsCache.highScoresData.lastRequest = now;
          GatsRequests.gatsCache.highScoresData.data = data;
          return data;
        })
        .catch(err => {
            // Log error
            new WaffleResponse().setErrorLocale("requestTopFiveData").setError(err).reply();
            return [];
        });
    }
    return Promise.resolve(GatsRequests.gatsCache.highScoresData.data);
  }

  static _loadCheerioData(url) {
    return axios.get(url)
      .then(response => response.data)
      .then(data => cheerio.load(data, { normalizeWhitespace: true }));
  }

  static _requestStatsData(url) {
    return GatsRequests._loadCheerioData(url)
      .then(cdata => {
        const vipSelector = `#pageContainer > h1`;
        const nameSelector = (nthChild) => `#pageContainer > div:nth-child(${nthChild}) > div:nth-child(1) > h1`;
        const statsSelector = (nthChild) => `#pageContainer > div:nth-child(${nthChild}) > div:nth-child(1) > table > tbody > tr`;
        const favoriteLoadoutsSelector = (nthChild) => `#pageContainer > div:nth-child(${nthChild}) > div:nth-child(2) > div > table > tbody > tr`;

        // Collect vip details
        const vip = getSafe(() => {
          const vipData = cdata(vipSelector).text().trim().split('\n').filter(t => t !== '');
          let isVip = false;
          let since = null;
          if (vipData.length === 2 && vipData[0] === 'Premium Member') {
            isVip = true;
            since = vipData[1].substring(6);
          }
          return { isVip, since }
        }, { isVip: false, since: null });

        const nthChild = vip.isVip ? 3 : 1;

        // Collect proper name
        const name = getSafe(() => cdata(nameSelector(nthChild)).text().trim().split(' ')[0], 'unknown');

        const stats = cdata(statsSelector(nthChild)).map((_, elem) => {
          const stat = getSafe(() => elem.children[1].children[0].data.trim(), 'no stat');
          const value = getSafe(() => elem.children[3].children[0].data.trim(), 'no value');
          return { stat, value };
        }).get();

        // Collect Favorite Loadouts
        const favoriteLoadouts = cdata(favoriteLoadoutsSelector(nthChild)).map((_, elem) => {
          const stat = getSafe(() => elem.children[1].children[1].children[0].data.trim(), 'no stat');
          const value = getSafe(() => elem.children[1].children[3].children[0].data.trim(), 'no value');
          const imageUrl = getSafe(() => `https://stats.gats.io${elem.children[3].children[0].attribs.src.trim()}`, gatsLogoUrl);
          return { stat, value, imageUrl };
        }).get();

        return { url, name, stats, favoriteLoadouts, vip };
      });
  }
}

module.exports = GatsRequests;