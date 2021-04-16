const GatsRequests = require("./GatsRequests");
const ArgumentHandler = require("../message/ArgumentHandler");
const {
  dynamicStrSpaceFill,
  getNumberFromArguments,
  randomFromArray,
  sendChannel,
  zeroWidthSpaceChar: z,
} = require("../util/WaffleUtil");
const { gatsUrl, gatsLogoUrl, statsUrl } = require("./GatsConstants");
const { json } = require("express");

class GatsScraper {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.playerStatsUrl = (stat, pageNum) =>
      `${statsUrl}stat/${stat}?page=${pageNum}`;
    this.clanStatsUrl = (stat, pageNum) =>
      `${statsUrl}clans/top/${stat}?page=${pageNum}`;
    this.TopStatType = {
      PLAYER: 1,
      CLAN: 2,
    };
    this.WeaponStatType = {
      PISTOL: "pistol",
      SMG: "smg",
      SHOTGUN: "shotgun",
      ASSAULT: "assault",
      SNIPER: "sniper",
      LMG: "lmg",
    };

    // High-level breakdown
    this.gatsArgs = new ArgumentHandler()
      .addCmdsForCategory("Gats", "clanstats", (args) => this.clanstats(args))
      .addCmdsForCategory("Gats", "playerstats", (args) =>
        this.playerstats(args)
      )
      .addCmdsForCategory("Gats", "top", (args) => this.top(args))
      .addCmdsForCategory("Gats", "changelog", (args) => this.changeLog(args))
      .addCmdsForCategory("Gats", "top5", () => this.getTopFive())
      .addCmdsForCategory("Gats", "gatsservers", () => this.getServers());

    // Mid-level breakdown #1
    this.weaponArg = new ArgumentHandler()
      .addCmds(
        ["pistol", "piss", "pis", "p", "small gun", "annoying gun"],
        this.WeaponStatType.PISTOL,
        true
      )
      .addCmds(
        ["sub machine gun", "sub-machine gun", "smg", "gun for noobs"],
        this.WeaponStatType.SMG,
        true
      )
      .addCmds(
        ["shot gun", "shotty", "shot", "sg", "cheater gun"],
        this.WeaponStatType.SHOTGUN,
        true
      )
      .addCmds(
        [
          "assault rifle",
          "assault",
          "rifle",
          "ass",
          "a",
          "the gun literally nobody uses",
        ],
        this.WeaponStatType.ASSAULT,
        true
      )
      .addCmds(
        ["sniper", "snip", "s", "dorf's weapon of choice", "meadow gun"],
        this.WeaponStatType.SNIPER,
        true
      )
      .addCmds(
        [
          "light machine gun",
          "light-machine gun",
          "lmg",
          "l",
          "big boy",
          "big boi",
          "big boi gun",
          "big boy gun",
        ],
        this.WeaponStatType.LMG,
        true
      );

    // Mid-level breakdown #2
    this.clanOrPlayerArg = new ArgumentHandler()
      .addCmds(["player", "players"], this.TopStatType.PLAYER)
      .addCmds(["clan", "clans"], this.TopStatType.CLAN);

    // Low-level breakdown
    this.topStatArgs = new ArgumentHandler()
      .addCmds(["score", "scores"], (topStatType, pageNum) =>
        topStatType === this.TopStatType.PLAYER
          ? this._topPlayerStats(this.playerStatsUrl("highestscore", pageNum))
          : this._topClanStats(this.clanStatsUrl("totalscore", pageNum))
      )
      .addCmds(["kill", "kills", "killer", "killers"], (topStatType, pageNum) =>
        topStatType === this.TopStatType.PLAYER
          ? this._topPlayerStats(this.playerStatsUrl("mostkills", pageNum))
          : this._topClanStats(this.clanStatsUrl("totalkills", pageNum))
      )
      .addCmds(
        ["k d", "kds", "k/d", "k/ds", "k d r", "kd ratio", "kill death ratio"],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("kdratios", pageNum))
            : this._topClanStats(this.clanStatsUrl("kdratios", pageNum)),
        true
      )
      .addCmds(
        ["k s", "kill streak", "kill streaks"],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("killstreaks", pageNum))
            : this._topClanStats(this.clanStatsUrl("killstreaks", pageNum)),
        true
      )
      .addCmds(
        ["s p m", "score per minute"],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("scorepermin", pageNum))
            : this._topClanStats(this.clanStatsUrl("scorepermin", pageNum)),
        true
      )
      .addCmds(
        ["s f", "shot", "shots", "shot fired", "shots fired"],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("shots", pageNum))
            : this._topClanStats(this.clanStatsUrl("shots", pageNum)),
        true
      )
      .addCmds(
        ["acc", "accuracy"],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("accuracy", pageNum))
            : this._topClanStats(this.clanStatsUrl("accuracy", pageNum)),
        true
      )
      .addCmds(
        [
          "km",
          "mi",
          "kms",
          "miles",
          "kilometers",
          "kilometres",
          "dist",
          "distance",
          "distance covered",
        ],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("distance", pageNum))
            : this._topClanStats(this.clanStatsUrl("distance", pageNum)),
        true
      )
      .addCmds(
        [
          "hrs",
          "hours",
          "time",
          "played",
          "time played",
          "hrs played",
          "hours played",
        ],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("hours", pageNum))
            : this._topClanStats(this.clanStatsUrl("hours", pageNum)),
        true
      )
      .addCmds(
        [
          "pistol",
          "pistols",
          "pistoler",
          "pistolers",
          "pistol kill",
          "pistol kills",
          "with pistol",
          "with pistols",
        ],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("pistol", pageNum))
            : this._topClanStats(this.clanStatsUrl("pistol", pageNum)),
        true
      )
      .addCmds(
        [
          "smg",
          "smgs",
          "smger",
          "smgers",
          "smg kill",
          "smg kills",
          "with smg",
          "with smgs",
          "sub machine gun",
        ],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("smg", pageNum))
            : this._topClanStats(this.clanStatsUrl("smg", pageNum)),
        true
      )
      .addCmds(
        [
          "shotty",
          "shottie",
          "shotgun",
          "shotties",
          "shotguns",
          "shotgunner",
          "shotgunners",
          "shotgun kill",
          "shotgun kills",
          "with shotgun",
          "with shotguns",
        ],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("shotgun", pageNum))
            : this._topClanStats(this.clanStatsUrl("shotgun", pageNum)),
        true
      )
      .addCmds(
        [
          "ass",
          "assault",
          "assaults",
          "assaulter",
          "assaulters",
          "assault kill",
          "assault kills",
          "with ass",
          "with assault",
          "with assaults",
          "assault rifle",
          "with assault rifle",
        ],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("assault", pageNum))
            : this._topClanStats(this.clanStatsUrl("assault", pageNum)),
        true
      )
      .addCmds(
        [
          "snip",
          "snips",
          "snipz",
          "snipe",
          "snipes",
          "snipez",
          "sniper",
          "snipers",
          "sniper kill",
          "sniper kills",
          "with sniper",
          "with snipers",
          "sniper rifle",
          "with sniper rifle",
        ],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("sniper", pageNum))
            : this._topClanStats(this.clanStatsUrl("sniper", pageNum)),
        true
      )
      .addCmds(
        [
          "lmg",
          "lmgs",
          "lmger",
          "lmgers",
          "lmg kill",
          "lmg kills",
          "with lmg",
          "with lmgs",
          "light machine gun",
          "with light machine gun",
        ],
        (topStatType, pageNum) =>
          topStatType === this.TopStatType.PLAYER
            ? this._topPlayerStats(this.playerStatsUrl("lmg", pageNum))
            : this._topClanStats(this.clanStatsUrl("lmg", pageNum)),
        true
      )
      // Unique to Clan Stats
      .addCmds(
        ["score per member"],
        (topStatType, pageNum) =>
          this._topClanStats(this.clanStatsUrl("scorepermember", pageNum)),
        true
      )
      .addCmds(
        ["kills per member", "kpm"],
        (topStatType, pageNum) =>
          this._topClanStats(this.clanStatsUrl("killspermember", pageNum)),
        true
      )
      .addCmds(
        ["total members", "members", "member"],
        (topStatType, pageNum) =>
          this._topClanStats(this.clanStatsUrl("totalmembers", pageNum)),
        true
      );
    this.ready = true;
    console.log("✅ GatsScraper is ready.");
  }

  // High-level handler
  static messageConsumer(msg, args) {
    // Initialize context
    const { guild, channel, content } = msg;
    const { name: guildName } = guild;
    const { username } = msg.author;
    const ctx = { guildName, username, content, err: null };

    // Exit if not initialized
    if (!this.ready) {
      ctx.err = `Feature is down at the moment`;
      return sendChannel(channel, { description: ctx.err }, ctx);
    }

    // Collect high-level arguments (top, top5, ps, etc..)
    const parseRes = this.gatsArgs.parseArguments(args);
    if (!parseRes.exists) {
      return;
    }

    // Execute high-level argument function
    parseRes
      .value(ArgumentHandler.removeArgs(args, parseRes.parseLength))
      .then((embed) => {
        sendChannel(channel, embed, ctx);
      })
      .catch((err) => {
        ctx.err = err;
        sendChannel(channel, { description: ctx.err }, ctx);
      });
  }

  // ~~~~~~~~~~~~~~~~~ Mid-level handler | At this stage "w top" has been removed ~~~~~~~~~~~~~~~~~~~~~~~

  static top(args) {
    // Check for 'clan', 'clans', 'player', 'players' argument
    const clanOrPlayerArg = this.clanOrPlayerArg.parseArguments(args);
    if (!clanOrPlayerArg.exists) {
      // Check for 'sniper', 'killstreak', 'kilometers'
      const topStatArg = this.topStatArgs.parseArguments(args);
      if (!topStatArg.exists) {
        // Grab optional page number '3', '7'
        const pageNum = getNumberFromArguments(args) || 1;
        return this._topPlayerStats(
          this.playerStatsUrl("highestscore", pageNum)
        );
      }
      const argsWithoutTopStat = ArgumentHandler.removeArgs(
        args,
        topStatArg.parseLength
      );
      const pageNum = getNumberFromArguments(argsWithoutTopStat) || 1;
      return topStatArg.value(this.TopStatType.PLAYER, pageNum);
    }

    // Check for 'sniper', 'killstreak', 'kilometers', 'with shotgun'
    const argsAfterClanOrPlayer = ArgumentHandler.removeArgs(
      args,
      clanOrPlayerArg.parseLength
    );
    const topStatArg = this.topStatArgs.parseArguments(argsAfterClanOrPlayer);
    if (!topStatArg.exists) {
      // Grab optional page number '3', '7'
      const pageNum = getNumberFromArguments(argsAfterClanOrPlayer) || 1;
      if (clanOrPlayerArg.value === this.TopStatType.PLAYER) {
        return this._topPlayerStats(
          this.playerStatsUrl("highestscore", pageNum)
        );
      }
      return this._topClanStats(this.clanStatsUrl("totalscore", pageNum));
    }
    const argsWithoutTopStat = ArgumentHandler.removeArgs(
      argsAfterClanOrPlayer,
      topStatArg.parseLength
    );
    const pageNum = getNumberFromArguments(argsWithoutTopStat) || 1;
    return topStatArg.value(clanOrPlayerArg.value, pageNum);
  }

  static _topPlayerStats(url) {
    const sp2 = ` ${z} `;
    const sp3 = ` ${z} ${z} `;
    return GatsRequests.requestTopPlayerStatsData(url)
      .then((data) => {
        const { title, stats, url } = data;

        // only use 25 results and get longest score length
        const statsSlice = stats.slice(0, 25);
        let longestScore = 0;
        statsSlice.forEach((s) => {
          if (s.score.length > longestScore) {
            longestScore = s.score.length;
          }
        });

        // build thumbnail
        const thumbnail = {
          url: gatsLogoUrl,
        };

        // build description
        const description = statsSlice
          .map((s) => {
            const rankSpace = s.rank > 9 ? " " : sp2;
            const score = dynamicStrSpaceFill(s.score, longestScore);
            const clanName = s.hasClan ? `[${s.clanName}]` : "";
            const crown = s.rank === "1" ? `${sp3}:crown:` : "";
            const moneyBags = s.isVip ? `${sp3}:moneybag:` : "";
            const waffle = s.username === "dorfnox" ? `${sp3}:waffle:` : "";
            return `\`#${s.rank}${rankSpace}•${sp2}${score}\`${sp3}**${s.username}**${sp2}${clanName}${crown}${moneyBags}${waffle}`;
          })
          .join("\n");

        // build fields
        const fields = {
          name: z,
          value: `[View these stats online](${url})`,
          inline: false,
        };
        return { title, thumbnail, description, fields };
      })
      .catch((err) => {
        console.log("_topPlayerStats Err:", err);
        throw "⚠️ Failed to request data from stats.gats.io";
      });
  }

  static _topClanStats(url) {
    const sp2 = ` ${z} `;
    const sp3 = ` ${z} ${z} `;
    return GatsRequests.requestTopClanStatsData(url)
      .then((data) => {
        const { title, stats, url } = data;

        // only use 25 results and get longest score length
        const statsSlice = stats.slice(0, 25);
        let longestScore = 0;
        statsSlice.forEach((s) => {
          if (s.score.length > longestScore) {
            longestScore = s.score.length;
          }
        });

        // build thumbnail
        const thumbnail = {
          url: gatsLogoUrl,
        };

        // build description
        const description = statsSlice
          .map((s) => {
            const rankSpace = s.rank > 9 ? " " : sp2;
            const score = dynamicStrSpaceFill(s.score, longestScore);
            const crown = s.rank === "1" ? `${sp3}:crown:` : "";
            return `\`#${s.rank}${rankSpace}•${sp2}${score}\`${sp3}**${s.clanName}**${sp2}[${s.tag}]${sp2}*${s.members} members*${crown}`;
          })
          .join("\n");

        // build fields
        const fields = {
          name: z,
          value: `[View these stats online](${url})`,
          inline: false,
        };
        return { title, thumbnail, description, fields };
      })
      .catch((err) => {
        console.log("_topClanStats Err:", err);
        throw "⚠️ Failed to request data from stats.gats.io";
      });
  }

  /* ~~~~~~~~~~~~~~~~~ PLAYER & CLAN STATS ~~~~~~~~~~~~~~~~~~~~~~~~ */

  static playerstats(args) {
    if (!args) {
      return Promise.reject(
        "⚠️ Please provide a player name argument. eg: **dorfnox**"
      );
    }
    const argArray = args.split(/\s+/g);
    const playerName = argArray[0];
    const statArgument = this.weaponArg.parseArguments(
      ArgumentHandler.removeArgs(args, 1)
    );
    const statToDisplay = statArgument.exists ? statArgument.value : "stats";
    return GatsRequests.requestPlayerStatsData(playerName)
      .then((allStats) => {
        if (!allStats || !allStats.stats || !allStats.stats[0]) {
          return {
            description: `⚠️ No stats found for player **${playerName}**. Maybe you made a typo?`,
          };
        }
        const { stats, weaponStats, favoriteLoadouts, vip, clan } = allStats;
        const statData = statArgument.exists
          ? weaponStats[statToDisplay]
          : stats;
        const title = `Player Stats for ${allStats.name}`;
        const description = `${
          vip.isVip ? `:medal: *VIP member since ${vip.since}* :medal:\n\n` : ""
        }`
          .concat(
            !clan.name
              ? `${z}\n`
              : `**Member of Clan:** [${clan.name}](${clan.link})\n\n`
          )
          .concat(
            statArgument.exists
              ? `\`${
                  statToDisplay.charAt(0).toUpperCase() + statToDisplay.slice(1)
                } Stats\`\n`
              : "`General Stats`\n"
          )
          .concat(statData.map((s) => `**${s.stat}:** ${s.value}`).join("\n"));
        const thumbnail = { url: favoriteLoadouts[0].imageUrl };
        const fields = [
          { name: z, value: "***Favorite Loadouts***" },
          ...favoriteLoadouts.map((fl) => {
            return { name: fl.stat, value: fl.value, inline: true };
          }),
          {
            name: z,
            value: `[View these stats online](${allStats.url})`,
          },
        ];
        return { title, description, fields, thumbnail };
      })
      .catch((err) => {
        console.log("playerstats Err:", err);
        throw "⚠️ Unable to request player stats data at this time. Bug Dorfnox.";
      });
  }

  static clanstats(args) {
    if (!args) {
      Promise.reject("⚠️ Please provide a clan name argument. eg: **KCSS**");
    }
    const argArray = args.split(/\s+/g);
    const clanName = argArray[0];
    const statArgument = this.weaponArg.parseArguments(
      ArgumentHandler.removeArgs(args, 1)
    );
    const statToDisplay = statArgument.exists ? statArgument.value : "stats";
    return GatsRequests.requestClanStatsData(clanName)
      .then((allStats) => {
        if (!allStats || !allStats.stats || !allStats.stats[0]) {
          return {
            description: `⚠️ No stats found for clan **${clanName}**. Maybe you made a typo?`,
          };
        }
        const { stats, weaponStats, favoriteLoadouts } = allStats;
        const statData = statArgument.exists
          ? weaponStats[statToDisplay]
          : stats;
        const title = `Clan Stats for ${allStats.name}`;
        const description = `\`${
          statArgument.exists
            ? statToDisplay.charAt(0).toUpperCase() + statToDisplay.slice(1)
            : "General"
        } Stats\`\n`.concat(
          statData.map((s) => `**${s.stat}:** ${s.value}`).join("\n")
        );
        const thumbnail = { url: favoriteLoadouts[0].imageUrl };
        const fields = [
          { name: z, value: "***Favorite Loadouts***" },
          ...favoriteLoadouts.map((fl) => {
            return { name: fl.stat, value: fl.value, inline: true };
          }),
          {
            name: z,
            value: `[View these stats online](${allStats.url})`,
          },
        ];
        return { title, description, thumbnail, fields };
      })
      .catch((err) => {
        console.log("clanstats Err:", err);
        throw "⚠️ Unable to request clan stats data at this time. Bug Dorfnox.";
      });
  }

  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ CHANGELOG ~~~~~~~~~~~~~~~~~ */

  static changeLog() {
    return GatsRequests.requestChangeLog()
      .then((data) => {
        const { date, changes, url } = data;
        // Title
        const title = `Changelog | ${date}`;

        // Description
        const description = `${changes
          .map((c) => `> ${c}`)
          .join(`\n> ${z}\n`)}\n\n[View the changelog online](${url})`;
        // Thumbnail
        const thumbnail = { url: gatsLogoUrl };
        return { title, description, url, thumbnail };
      })
      .catch((err) => {
        console.log("changeLog Err:", err);
        throw "⚠️ Unable to request change log data at this time. Bug Dorfnox.";
      });
  }
  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ PLAYERS ONLINE ~~~~~~~~~~~~~~~~~~~ */

  static getServers() {
    return GatsRequests.requestGatsServers()
      .then((servers) => {
        if (servers.length === 0 || servers === null || servers === undefined)
          throw "I can't fetch the data for some reason, annoy fish cuz Dorf is busy!";
        const title = "Players Online in Gats.io";
        let serverData = servers.map(
          (server) =>
            `${server.city} ${server.game_type}: **${server.players}** players online`
        );
        const description = `${serverData
          .map((info) => `\n${info}`)
          .join(`\n`)}`;
        const thumbnail = { url: gatsLogoUrl };
        return Promise.resolve({ title, description, thumbnail });
      })
      .catch((err) => {
        console.log("gatsServer Err:", err);
        throw "⚠️ Unable to get server data, bug fish cuz Dorfnox is busy!";
      });
  }
  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ TOP FIVE LEADERBOARD ~~~~~~~~~~~~~~~~~ */

  static getTopFive() {
    const sp2 = ` ${z} `;
    const sp3 = ` ${z} ${z} `;
    return GatsRequests.requestTopFiveData()
      .then((data) => {
        if (!data.length) {
          throw "⚠️ Could not find gats top five data";
        }

        // Get longest str length of scores
        let longestScore = 0;
        data.forEach((p) => {
          if (p.points.length + 1 > longestScore) {
            longestScore = p.points.length + 1;
          }
        });

        // Title
        const title = `Current Top Five Players on the Leaderboard`;

        // Thumbnail
        const thumbnail = { url: gatsLogoUrl };

        // Description
        const description = `\n${sp2}\n`.concat(
          data
            .map((p) => {
              const { isVip, position, player, points, playerStats } = p;
              const { stats, url } = playerStats;
              const { stat, value } = randomFromArray(stats);

              const dynamicPoints = dynamicStrSpaceFill(points, longestScore);
              const waffle = player === "dorfnox" ? `${sp3}:waffle:` : "";
              const moneyBag = isVip ? `${sp3}:moneybag:` : "";
              const crown = position === "1" ? `${sp3}:crown:` : "";
              const funFact = `\n*fun fact*:${sp3}${player}'s [${stat.toLowerCase()}](${url}) is **${value}**!\n`;
              return `\`#${position} •${sp2}${dynamicPoints}\`${sp2}**${player}**${waffle}${moneyBag}${crown}${funFact}`;
            })
            .join("\n")
            .concat(
              `\n\n[Find the leaderboard on the Gats homepage](${gatsUrl})`
            )
        );

        return { title, thumbnail, description };
      })
      .catch((err) => {
        console.log("getTopFive Err:", err);
        throw "⚠️ An error occurred getting the leaderboard data. Bug Dorfnox.";
      });
  }
}

module.exports = GatsScraper;
