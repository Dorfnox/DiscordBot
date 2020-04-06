const Nightmare = require('nightmare');
const WaffleResponse = require('./WaffleResponse');
const { getSafe, zeroWidthSpaceChar } = require('./WaffleUtil');
const axios = require('axios').default;
const cheerio = require('cheerio');

class GatsScraper {
  gatsCache = {
    highScoresData: {
      siteUrl: "https://gats.io/",
      lastRequest: 0,
      data: {}
    }
  };
  gatsLogoUrl = 'https://stats.gats.io/img/gats_logo.png';

  topArgs = (() => {
    const argMap = new Map();
    ['clan', 'clans'].forEach(a => argMap.set(a, () => this._topClans()));
    ['score', 'scores'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/score`)));

    ['kill', 'kills'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/kills`)));
    ['kd', 'kds', 'kdr', 'kdratio', 'killdeathratio'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/kdratios`)));
    ['ks', 'killstreak', 'killstreaks', 'killsstreaks', 'kstreak', 'kstreaks'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/killstreaks`)));

    ['spm', 'scoreperminute'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/scorepermin`)));
    ['sf', 'shot', 'shots', 'shotfired', 'shotsfired'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/shots`)));
    ['acc', 'accuracy'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/accuracy`)));

    ['km', 'mi', 'kms', 'miles', 'kilometers', 'kilometres', 'dist', 'distance', 'distancecovered'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/distance`)));
    ['hrs', 'hrsplayed', 'hours', 'time', 'played', 'timeplayed', 'hoursplayed'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/hours`)));

    ['pistol', 'pistols', 'pistolkill', 'pistolkills', 'withpistol', 'withpistols', 'withpistolkill', 'withpistolkills'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/pistol`)));
    ['smg', 'smgs', 'smgkill', 'smgkills', 'withsmg', 'withsmgs', 'withsmgkill', 'withsmgkills'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/smg`)));
    ['shotgun', 'shotguns', 'shotgunkill', 'shotgunkills', 'withshotgun', 'withshotguns', 'withshotgunkill', 'withshotgunkills'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/shotgun`)));
    ['ass', 'assault', 'assaults', 'assaultkill', 'assaultkills', 'withass', 'withassault', 'withassaults', 'withassaultkill', 'withassaultkills'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/assault`)));
    ['sniper', 'snipers', 'sniperkill', 'sniperkills', 'withsniper', 'withsnipers', 'withsniperkill', 'withsniperkills'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/sniper`)));
    ['lmg', 'lmgs', 'lmgkill', 'lmgkills', 'withlmg', 'withlmgs', 'withlmgkill', 'withlmgkills'].forEach(a => argMap.set(a, () => this._topPlayers(`https://stats.gats.io/stat/lmg`)));
    return argMap;
  })();

  clanstats(args) {
    const wr = new WaffleResponse();
    return new Promise(resolve => {
      if (!args || !args[0]) {
        return resolve(wr.setResponse('⚠️ Please provide a clan name argument. eg: KCGO'));
      }
      const clanName = args[0];

      this._requestClanStatsData(clanName)
        .then(allStats => {
          if (!allStats || !allStats.stats || !allStats.stats[0]) {
            return resolve(wr.setEmbeddedResponse({ description: `*No stats found for clan* **${clanName}**. Maybe you made a typo?` }));
          }
          const { stats, favoriteLoadouts } = allStats;
          const title = `Clan Stats for ${allStats.name}`;
          const description = stats.map(s => `**${s.stat}:** ${s.value}`).join('\n');
          const thumbnail = { url: favoriteLoadouts[0].imageUrl };
          const fields = [
            { name: zeroWidthSpaceChar, value: '***Favorite Loadouts***'},
            ...favoriteLoadouts.map(fl => { return { name: fl.stat, value: fl.value, inline: true } }),
            { name: zeroWidthSpaceChar, value: `[View these stats online](${allStats.url})` }
          ];
          return resolve(wr.setEmbeddedResponse({ title, description, thumbnail, fields }));
        });
    })
    .catch(err => {
      return wr.setResponse('⚠️ Unknown error occurred').setError(err).setIsSendable(false);
    });
  }

  getTopFive() {
    const wr = new WaffleResponse();
    const now = Date.now();
    // Only update cache if it's been more than 5 minutes
    if (now - this.gatsCache.highScoresData.lastRequest > 300000) {
      return Nightmare({ show: false, gotoTimeout: 15000, waitTimeout: 15000 })
        .goto(this.gatsCache.highScoresData.siteUrl)
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
              points: elems[2]
            };
          });
          this.gatsCache.highScoresData.lastRequest = now;
          this.gatsCache.highScoresData.data = data;
          return Promise.resolve(wr.setResponse(data));
        })
        .catch(err => {
          wr.setResponse("*⚠️ Failed to scrape gats for data*")
            .setErrorLocale("getTopFive")
            .setError(err);
          return Promise.reject(wr);
        });
    }
    return Promise.resolve(wr.setResponse(this.gatsCache.highScoresData.data));
  }

  playerstats(args) {
    const wr = new WaffleResponse();
    return new Promise(resolve => {
      if (!args || !args[0]) {
        return resolve(wr.setResponse('⚠️ Please provide a player name argument. eg: dorfnox'));
      }
      const playerName = args[0];

      this._requestPlayerStatsData(playerName)
        .then(allStats => {
          if (!allStats || !allStats.stats || !allStats.stats[0]) {
            return resolve(wr.setEmbeddedResponse({ description: `*No stats found for player* **${playerName}**. Maybe you made a typo?` }));
          }
          const { stats, favoriteLoadouts } = allStats;
          const title = `Player Stats for ${allStats.name}`;
          const description = stats.map(s => `**${s.stat}:** ${s.value}`).join('\n');
          const thumbnail = { url: favoriteLoadouts[0].imageUrl };
          const fields = [
            { name: zeroWidthSpaceChar, value: '***Favorite Loadouts***'},
            ...favoriteLoadouts.map(fl => { return { name: fl.stat, value: fl.value, inline: true } }),
            { name: zeroWidthSpaceChar, value: `[View these stats online](${allStats.url})` }
          ];
          return resolve(wr.setEmbeddedResponse({ title, description, fields, thumbnail }));
        });
    })
    .catch(err => {
      return wr.setResponse('⚠️ Unknown error occurred').setError(err).setIsSendable(false);
    });
  }

  top(args) {
    const wr = new WaffleResponse();
    return new Promise(resolve => {
      wr.setResponse(`Try something like 'w top clans', or 'w best shotgun'`);
      if (!args || !args[0]) {
        return resolve(wr);
      }

      const topFunc = this.topArgs.get(args.join('').trim().toLowerCase());
      return resolve(!topFunc ? wr : topFunc());
    })
    .catch(err => wr.setResponse('⚠️ Unknown error occurred').setError(err).setIsSendable(false));
  }

  _loadCheerioData(url) {
    return axios.get(url)
      .then(response => response.data)
      .then(data => cheerio.load(data, { normalizeWhitespace: true }));
  }

  _requestClanStatsData(clanName) {
    const url = `https://stats.gats.io/clan/${clanName}`;
    return this._requestStatsData(url);
  }

  _requestPlayerStatsData(playerName) {
    const url = `https://stats.gats.io/${playerName}`;
    return this._requestStatsData(url);
  }

  _requestStatsData(url) {
    return this._loadCheerioData(url)
      .then(cdata => {
        // Collect proper name
        const name = getSafe(() => cdata('#pageContainer > div:nth-child(1) > div:nth-child(1) > h1').text().trim().split(' ')[0], 'unknown');

        // Collect Regular Stats
        const stats = cdata('#pageContainer > div:nth-child(1) > div:nth-child(1) > table > tbody > tr').map((_, elem) => {
          const stat = getSafe(() => elem.children[1].children[0].data.trim(), 'no stat');
          const value = getSafe(() => elem.children[3].children[0].data.trim(), 'no value');
          return { stat, value };
        }).get();

        // Collect Favorite Loadouts
        const favoriteLoadouts = cdata('#pageContainer > div:nth-child(1) > div:nth-child(2) > div > table > tbody > tr').map((_, elem) => {
          const stat = getSafe(() => elem.children[1].children[1].children[0].data.trim(), 'no stat');
          const value = getSafe(() => elem.children[1].children[3].children[0].data.trim(), 'no value');
          const imageUrl = getSafe(() => `https://stats.gats.io${elem.children[3].children[0].attribs.src.trim()}`, this.gatsLogoUrl);
          return { stat, value, imageUrl };
        }).get();

        return { url, name, stats, favoriteLoadouts };
      });
  }

  _requestTopClanStatsData() {
    const url = `https://stats.gats.io/clans/top`;
    return this._loadCheerioData(url)
      .then(cdata => {
        // Collect Clan Stats
        const stats = cdata(`#pageContainer > div > div.col-xs-12.col-sm-8.col-md-8 > table > tbody > tr`).map((_, elem) => {
          const tdElem = cheerio(elem).children('td');
          const rank = getSafe(() => tdElem[0].children[0].data.trim(), '?');
          const clanName = getSafe(() => tdElem[1].children[0].data.trim(), 'unknown');
          const score = getSafe(() => tdElem[4].children[0].data.trim(), 'unknown');
          return { rank, clanName, score };
        }).get();

        return { url, stats };
      });
  }

  _requestTopPlayerStatsData(url) {
    return this._loadCheerioData(url)
      .then(cdata => {
        // Collect Top / Highest / Longest Stats
        const stats = cdata(`#pageContainer > div > div.col-xs-12.col-sm-8.col-md-8 > table > tbody > tr`).map((_, elem) => {
          const rank = getSafe(() => elem.children[1].children[0].data.trim(), '?');
          const tempNames = getSafe(() => elem.children[3].children[1].children[0].data.trim().split('\n'), 'unknown');
          const username = getSafe(() => tempNames[tempNames.length - 1], 'unknown');
          const clanName = getSafe(() => tempNames.length > 1 ? tempNames[0].replace(/[\[\]]+/g, '') : ' ---- ', 'unknown');
          const score = getSafe(() => elem.children[5].children[0].data.trim(), 'unknown');
          return { rank, username, clanName, score };
        }).get();

        return { url, stats };
      });
  }

  /* TOP Functions */

  _topClans() {
    const wr = new WaffleResponse();
    return this._requestTopClanStatsData()
      .then(data => {
        console.log(data);
        const text = data.stats.map(s => {
          const rank = s.rank === '1' ? ':crown:' : s.rank;
          return `${rank} ~ **${s.clanName}** ${s.score}`;
        }).join('\n');
        return wr.setResponse(text);
      })
      .catch(err => wr.setResponse('⚠️ Unknown error occurred').setError(err));
  }

  _topPlayers(url) {
    const wr = new WaffleResponse();
    const sp = ` ${zeroWidthSpaceChar} `;
    return this._requestTopPlayerStatsData(url)
      .then(data => {
        const text = data.stats.map(s => {
          const rank = s.rank === '1' ? ':crown:' : s.rank;
          return `${rank} ~ ${sp}[${s.clanName}] ${sp}**${s.username}** ${sp}${s.score}`;
        }).join('\n');
        return wr.setResponse(text);
      })
      .catch(err => wr.setResponse('⚠️ Unknown error occurred').setError(err));
  }
}

module.exports = GatsScraper;