const GatsRequests = require('./GatsRequests');
const WaffleResponse = require('../message/WaffleResponse');
const { dynamicStrSpaceFill, randomFromArray, zeroWidthSpaceChar } = require('../util/WaffleUtil');
const { gatsUrl, gatsLogoUrl } = require('./GatsConstants');


class GatsScraper {
  
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

      GatsRequests.requestClanStatsData(clanName)
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
    const sp2 = ` ${zeroWidthSpaceChar} `;
    const sp3 = ` ${zeroWidthSpaceChar} ${zeroWidthSpaceChar} `;
    return GatsRequests.requestTopFiveData()
      .then(data => {
        const wr = new WaffleResponse();
        if (!data.length) {
          return wr.setResponse('⚠️ *Could not find gats top five data*');
        }

        // Get longest str length of scores
        let longestScore = 0;
        data.forEach(p => {
          if (p.points.length + 1 > longestScore) {
            longestScore = p.points.length + 1;
          }
        });

        // Title
        const title = `Current Top Five Players on the Leaderboard`;

        // Thumbnail
        const thumbnail = { url: gatsLogoUrl };

        // Desscription
        const description = `\n${sp2}\n`.concat(data.map(p => {
          const { isVip, position, player, points, playerStats } = p;
          const { stats, url } = playerStats;
          const { stat, value } = randomFromArray(stats);

          const dynamicPoints = dynamicStrSpaceFill(points, longestScore);
          const waffle = player === 'dorfnox' ? `${sp3}:waffle:` : '';
          const moneyBag = isVip ? `${sp3}:moneybag:` : '';
          const crown = position === '1' ? `${sp3}:crown:` : '';
          const funFact = `\n*fun fact*:${sp3}${player}'s [${stat.toLowerCase()}](${url}) is **${value}**!\n`;
          return `\`#${position} •${sp2}${dynamicPoints}\`${sp2}**${player}**${waffle}${moneyBag}${crown}${funFact}`;
        }).join('\n').concat(`\n\n[Find the leaderboard on the Gats homepage](${gatsUrl})`));

        return wr.setEmbeddedResponse({ title, thumbnail, description });;
      });
  }

  playerstats(args) {
    const wr = new WaffleResponse();
    return new Promise(resolve => {
      if (!args || !args[0]) {
        return resolve(wr.setResponse('⚠️ Please provide a player name argument. eg: **dorfnox**'));
      }
      const playerName = args[0];

      GatsRequests.requestPlayerStatsData(playerName)
        .then(allStats => {
          if (!allStats || !allStats.stats || !allStats.stats[0]) {
            return resolve(wr.setEmbeddedResponse({ description: `*No stats found for player* **${playerName}**. Maybe you made a typo?` }));
          }
          const { stats, favoriteLoadouts, vip } = allStats;
          const title = `Player Stats for ${allStats.name}`;
          const description = `${vip.isVip ? `:medal: *VIP member since ${vip.since}* :medal:\n\n` : ''}`.concat(stats.map(s => `**${s.stat}:** ${s.value}`).join('\n'));
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
      wr.setResponse('Try something like `w top clans`, or `waffle best with assault`');
      if (!args || !args[0]) {
        return resolve(wr);
      }

      const topFunc = this.topArgs.get(args.join('').trim().toLowerCase());
      return resolve(!topFunc ? wr : topFunc());
    })
    .catch(err => wr.setResponse('⚠️ Unknown error occurred').setError(err).setIsSendable(false));
  }

  /* TOP Functions */

  _topClanStats() {
    const wr = new WaffleResponse();
    const sp2 = ` ${zeroWidthSpaceChar} `;
    const sp3 = ` ${zeroWidthSpaceChar} ${zeroWidthSpaceChar} `;
    return GatsRequests.requestTopClanStatsData()
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
          url: gatsLogoUrl
        }

        // build description
        const description = statsSlice.map(s => {
            const rankSpace = s.rank > 9 ? ' ' : sp2;
            const score = dynamicStrSpaceFill(s.score, longestScore);
            const crown = s.rank === '1' ? `${sp3}:crown:` : '';
            return `\`#${s.rank}${rankSpace}•${sp2}${score}\`${sp3}**${s.clanName}**${sp2}[${s.tag}]${sp2}*${s.members} members*${crown}`;
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
    return GatsRequests.requestTopPlayerStatsData(url)
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
          url: gatsLogoUrl
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