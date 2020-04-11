const Nightmare = require('nightmare');
const WaffleResponse = require('./WaffleResponse');
const { dynamicStrSpaceFill, getSafe, zeroWidthSpaceChar } = require('./WaffleUtil');
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
    ['clan', 'clans'].forEach(a => argMap.set(a, () => this._topClanStats()));
    ['score', 'scores', 'player', 'players'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/score`)));

    ['kill', 'kills'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/kills`)));
    ['kd', 'kds', 'kdr', 'kdratio', 'killdeathratio'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/kdratios`)));
    ['ks', 'killstreak', 'killstreaks', 'killsstreaks', 'kstreak', 'kstreaks'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/killstreaks`)));

    ['spm', 'scoreperminute'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/scorepermin`)));
    ['sf', 'shot', 'shots', 'shotfired', 'shotsfired'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/shots`)));
    ['acc', 'accuracy'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/accuracy`)));

    ['km', 'mi', 'kms', 'miles', 'kilometers', 'kilometres', 'dist', 'distance', 'distancecovered'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/distance`)));
    ['hrs', 'hrsplayed', 'hours', 'time', 'played', 'timeplayed', 'hoursplayed'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/hours`)));

    ['pistol', 'pistols', 'pistolkill', 'pistolkills', 'withpistol', 'withpistols', 'withpistolkill', 'withpistolkills'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/pistol`)));
    ['smg', 'smgs', 'smgkill', 'smgkills', 'withsmg', 'withsmgs', 'withsmgkill', 'withsmgkills'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/smg`)));
    ['shotgun', 'shotguns', 'shotgunkill', 'shotgunkills', 'withshotgun', 'withshotguns', 'withshotgunkill', 'withshotgunkills'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/shotgun`)));
    ['ass', 'assault', 'assaults', 'assaultkill', 'assaultkills', 'withass', 'withassault', 'withassaults', 'withassaultkill', 'withassaultkills'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/assault`)));
    ['sniper', 'snipers', 'sniperkill', 'sniperkills', 'withsniper', 'withsnipers', 'withsniperkill', 'withsniperkills'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/sniper`)));
    ['lmg', 'lmgs', 'lmgkill', 'lmgkills', 'withlmg', 'withlmgs', 'withlmgkill', 'withlmgkills'].forEach(a => argMap.set(a, () => this._topPlayerStats(`https://stats.gats.io/stat/lmg`)));
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

  _requestTopPlayerStatsData(url) {
    return this._loadCheerioData(url)
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

  /* TOP Functions */

  _topClanStats() {
    const wr = new WaffleResponse();
    const sp2 = ` ${zeroWidthSpaceChar} `;
    const sp3 = ` ${zeroWidthSpaceChar} ${zeroWidthSpaceChar} `;
    return this._requestTopClanStatsData()
      .then(data => {
        const { title, stats, url } = data;
        
        // only use 25 results and get longest score length
        const statsSlice = stats.slice(0, 25);
        let longestScore = 0;
        statsSlice.forEach(s => {
          if (s.score.length > longestScore) {
            longestScore = s.score.length;
          }
        });

        // build thumbnail
        const thumbnail = {
          url: this.gatsLogoUrl
        }

        // build description
        const description = statsSlice.map(s => {
            const rankSpace = s.rank > 9 ? ' ' : sp2;
            const score = dynamicStrSpaceFill(s.score, longestScore);
            const crown = s.rank === '1' ? `${sp3}:crown:` : '';
            return `\`#${s.rank}${rankSpace}•${sp2}${score}\`${sp3}[ ${s.tag} ]${sp2}**${s.clanName}**${sp2}${s.members} members${crown}`;
          }).join('\n');

        // build fields
        const fields = {
          name: zeroWidthSpaceChar,
          value: `[View these stats online](${url})`,
          inline: false
        };
        return wr.setEmbeddedResponse({ title, thumbnail, description, fields }).setLogResponseLimit(40);
      })
      .catch(err => wr.setResponse('⚠️ Unknown error occurred').setError(err));
  }

  _topPlayerStats(url) {
    const wr = new WaffleResponse();
    const sp2 = ` ${zeroWidthSpaceChar} `;
    const sp3 = ` ${zeroWidthSpaceChar} ${zeroWidthSpaceChar} `;
    return this._requestTopPlayerStatsData(url)
      .then(data => {
        const { title, stats, url } = data;

        // only use 25 results and get longest score length
        const statsSlice = stats.slice(0, 25);
        let longestScore = 0;
        statsSlice.forEach(s => {
          if (s.score.length > longestScore) {
            longestScore = s.score.length;
          }
        });

        // build thumbnail
        const thumbnail = {
          url: this.gatsLogoUrl
        }

        // build description
        const description = statsSlice.map(s => {
            const rankSpace = s.rank > 9 ? ' ' : sp2;
            const score = dynamicStrSpaceFill(s.score, longestScore);
            const clanName = s.hasClan ? `[${s.clanName}]` : '';
            const crown = s.rank === '1' ? `${sp3}:crown:` : '';
            const waffle = s.username === 'dorfnox' ? `${sp3}:waffle:` : '';
            return `\`#${s.rank}${rankSpace}•${sp2}${score}\`${sp3}**${s.username}**${sp2}${clanName}${crown}${waffle}`;
          }).join('\n');

        // build fields
        const fields = {
          name: zeroWidthSpaceChar,
          value: `[View these stats online](${url})`,
          inline: false
        };
        return wr.setEmbeddedResponse({ title, thumbnail, description, fields }).setLogResponseLimit(40);
      })
      .catch(err => wr.setResponse('⚠️ Unknown error occurred').setError(err));
  }
}

module.exports = GatsScraper;