const Discord = require("discord.js");
const GatsScraper = require("../gats/GatsScraper");
const GenericResponse = require("../message/GenericResponse");
const WaffleMusic = require("../music/WaffleMusic");
const WaffleMusic2 = require("../music/WaffleMusic2");
const YoutubeDownloader = require("../music/YoutubeDownloader");
const Pokemon = require("../pokemon/Pokemon");
const WaffleMail = require("../mail/WaffleMail");
const OwnerCommands = require("../owner/OwnerCommands");
const GuildSettingsManager = require("../data-managers/GuildSettingsManager");
const TwitchChannelManager = require("../data-managers/TwitchChannelManager");
const WaffleResponse = require("./WaffleResponse");
const ArgumentHandler = require("./ArgumentHandler");
const {
  arrayFromObjectValues,
  getSafe,
  logger,
  randomFromArray,
} = require("../util/WaffleUtil");
const config = require("../../configWaffleBot.json");
const { prefixes } = config.chat;
const { modMailChannelCategoryName } = config.modMail;

class MessageHandler {
  constructor(client) {
    this.client = client;
    this.genericResponse = new GenericResponse(client);
    this.waffleMusic = new WaffleMusic(client);
    this.gatsScraper = new GatsScraper();
    this.pokemon = new Pokemon();
    this.waffleMail = new WaffleMail(client);
    this.cmdHandler = new ArgumentHandler()
      .addCmds(
        [
          "play",
          "p",
          "pause",
          "unpause",
          "up",
          "queue",
          "q",
          "join",
          "j",
          "leave",
          "l",
          "skip",
          "stop",
          "end",
          "finish",
          "repeat",
          "r",
          "song",
          "oops",
          "removelast",
        ],
        (msg, args) => WaffleMusic2.executeMusicCmd(msg, args)
      )
      .addCmds(["download", "dld", "dl"], (msg, args) =>
        YoutubeDownloader.messageConsumer(msg, args)
      )
      .addCmdsForCategory("Admin", null, (msg, args) =>
        GuildSettingsManager.messageConsumer(msg, args)
      )
      .addCmdsForCategory("General", null, (msg, args) =>
        GenericResponse.messageConsumer(msg, args)
      )
      .addCmdsForCategory("Owner", null, (msg, args) =>
        OwnerCommands.setStatus(msg, args)
      )
      .addCmdsForCategory("3rdPartyIntegrations", null, (msg, args) =>
        TwitchChannelManager.messageConsumer(msg, args)
      );
    this.helpCategory = {
      gats: {
        name: "Gats",
        description: "Queries for gats information.",
      },
      music: {
        name: "Music",
        description: "Control the music player.",
      },
      pokemon: {
        name: "Pokemon",
        description: "Interacts with Pokecord!",
      },
      owner: {
        name: "Owner",
        description:
          "A list of commands only the owner of the bot can use. Right now, just **Dorfnox** :waffle:",
      },
    };
    this.commands = {
      clanstats: {
        name: "Clanstats",
        execute: this.executeClanstats,
        description: `Displays the stats of a clan (eg: 'w clanstats kcgo').`,
        aliases: ["cs"],
        helpCategory: this.helpCategory.gats,
      },
      join: {
        name: "Join",
        execute: (msg, args) => this.waffleMusic.join(msg, args),
        description: "Provide the name of a VOICE CHANNEL to join.",
        aliases: ["j"],
        helpCategory: this.helpCategory.music,
      },
      pause: {
        name: "Pause",
        execute: this.executePause,
        description: "Pause the current song.",
        helpCategory: this.helpCategory.music,
      },
      play: {
        name: "Play",
        execute: this.executePlay,
        description: "Play a song via description/youtube-link. Also unpauses.",
        aliases: ["p", "pl"],
        helpCategory: this.helpCategory.music,
      },
      playerstats: {
        name: "PlayerStats",
        execute: this.executePlayerstats,
        description:
          "Displays the stats of a player (eg: w playerstats dorfnox).",
        aliases: ["ps"],
        helpCategory: this.helpCategory.gats,
      },
      "p!hint": {
        name: "p!hint",
        execute: (msg) => this.pokemon.processNextPokeBotMessage(msg),
        description: `Run 'w p!hint' before running 'p!hint' for a little ***more*** help.`,
        helpCategory: this.helpCategory.pokemon,
      },
      queue: {
        name: "Queue",
        execute: this.executeQueue,
        description: "Displays the current songs in the queue.",
        aliases: ["q"],
        helpCategory: this.helpCategory.music,
      },
      oops: {
        name: "Oops",
        execute: this.executeOops,
        description:
          "Removes the last song you accidentally entered into the queue.",
        helpCategory: this.helpCategory.music,
      },
      repeat: {
        name: "Repeat",
        execute: this.executeRepeat,
        description: "Queues up the currently playing song to be played again.",
        aliases: ["r"],
        helpCategory: this.helpCategory.music,
      },
      skip: {
        name: "Skip",
        execute: this.executeSkip,
        description:
          "Stops the current song, or removes from queue (eg: *skip 3*).",
        aliases: ["stop", "remove"],
        helpCategory: this.helpCategory.music,
      },
      song: {
        name: "Song",
        execute: this.executeSong,
        description: "Reveals the currently playing song",
        helpCategory: this.helpCategory.music,
      },
      top: {
        name: "Top",
        execute: this.executeTop,
        description:
          "Returns top clans, best snipers, highest scores, etc... eg: w best snipers",
        aliases: ["best", "highest", "most", "longest"],
        helpCategory: this.helpCategory.gats,
      },
      top5: {
        name: "Top5",
        execute: this.executeTopFive,
        description: "Get the top five players from the gats leaderboard.",
        helpCategory: this.helpCategory.gats,
      },
      unpause: {
        name: "Unpause",
        execute: this.executeUnpause,
        description: "Unpause the current song.",
        helpCategory: this.helpCategory.music,
      },
    };
    // Map of Alias -> Command (eg: p -> play )
    this.aliasMap = new Map();
    Object.keys(this.commands).forEach((cmd) => {
      if (this.commands[cmd].aliases) {
        this.commands[cmd].aliases.forEach((alias) =>
          this.aliasMap.set(alias, cmd)
        );
      }
    });
  }

  handleMessage(msg) {
    const { content, guild, channel, author } = msg;
    const { bot: isBot } = author;
    const wr = new WaffleResponse();

    if (!author) {
      return;
    }

    // Handle Direct Mod-Mail Messages
    if (!isBot && !guild && channel instanceof Discord.DMChannel) {
      return this.waffleMail.handleDM(msg);
    } else if (
      !isBot &&
      channel.parent &&
      channel.parent.name === modMailChannelCategoryName
    ) {
      return this.waffleMail.handleModChannel(msg);
    }

    // Handle Guild admin-controlled operations here
    if (isBot) {
      return GuildSettingsManager.offerBotToTheWaffleBomberAsASacrifice(msg);
    }

    // From this point forward, we ignore bot messages
    if (!content) {
      return;
    }

    // Quick hardcoded-prefix check here to avoid performant-heavy parsing later
    const prefixCheck = content.substr(0, 10).toLowerCase();
    if (!prefixes.some((prefix) => prefixCheck.startsWith(`${prefix} `)))
      return;

    // Execute Command, if exists
    const pRes = this.cmdHandler.parseArguments(content, true);
    if (pRes.exists) {
      try {
        pRes.value(msg, ArgumentHandler.removeArgs(content, 1));
      } catch (err) {
        getSafe(() => logger(guild.name, channel.name, author.username, err));
        console.log(err);
      }
      return;
    }

    // Parse out arguments
    const args = content
      .trim()
      .split(/\s+/)
      .filter((i) => i);

    // Escape if not equal to the prefix
    if (!prefixes.some((prefix) => args[0].toLowerCase() === prefix)) return;

    // No second argument
    if (args.length === 1) {
      return wr.setResponse("Give me some syrup!").reply(msg);
    }

    // Get Command and re-map if it is an alias
    const { commands: cmds } = this;
    let cmd = args[1].toLowerCase();
    cmd = !cmds[cmd] ? this.aliasMap.get(cmd) : cmd;

    // Not an acceptable command
    if (!cmd) {
      const replies = [
        `${args.slice(1).join(" ")}, that doesn't make any sense!`,
        "The heck are you expecting me to do?",
        "I know what you did last summer.",
      ];
      return wr.setResponse(randomFromArray(replies)).reply(msg);
    }

    const argsAfterCommand = args.slice(2).filter((arg) => arg.length);

    // Runs command
    cmds[cmd].execute.apply(this, [msg, argsAfterCommand]);
  }

  executeClanstats(msg, args) {
    this.gatsScraper.clanstats(args).then((wr) => wr.reply(msg));
  }

  executeHelp(msg, args) {
    const wr = new WaffleResponse();
    const helpCategoriesArray = arrayFromObjectValues(this.helpCategory);
    const helpCategory = (args[0] || "").toLowerCase();

    // If non-valid help category supplied
    if (
      !args ||
      !args.length ||
      !helpCategoriesArray.filter(
        (hc) => hc.name.toLowerCase() === helpCategory
      ).length
    ) {
      const title = `Try typing 'help' with one of the following sub-help categories.`;
      const description = helpCategoriesArray
        .map((hc) => `**${hc.name}**\n${hc.description}`)
        .join("\n\n");
      return wr.setEmbeddedResponse({ title, description }).reply(msg);
    }

    // Collect the category help details
    const title = this.helpCategory[helpCategory].description;
    const description = arrayFromObjectValues(this.commands)
      .filter((itm) => helpCategory === itm.helpCategory.name.toLowerCase())
      .map((itm) => {
        const val = `**${itm.name}**\n${itm.description}`;
        return itm.aliases
          ? `${val} Alias: '${itm.aliases.join(`', '`)}'.`
          : val;
      })
      .join("\n\n");
    wr.setEmbeddedResponse({ title, description }).reply(msg);
  }

  executeOops(msg) {
    this.waffleMusic.removeLast(msg).then((wr) => wr.reply(msg));
  }

  executePause(msg) {
    this.waffleMusic.pause(msg).then((wr) => wr.reply(msg));
  }

  executePlay(msg, args) {
    this.waffleMusic.play(msg, args).then((wr) => wr.reply(msg));
  }

  executePlayerstats(msg, args) {
    this.gatsScraper.playerstats(args).then((wr) => wr.reply(msg));
  }

  executeQueue(msg) {
    this.waffleMusic.queue(msg).then((wr) => wr.reply(msg));
  }

  executeRepeat(msg) {
    this.waffleMusic.repeat(msg).then((wr) => wr.reply(msg));
  }

  executeSkip(msg, args) {
    this.waffleMusic
      .skip(msg, Math.max(parseInt(args[0], 10) || 0, 0))
      .then((wr) => wr.reply(msg));
  }

  executeSong(msg) {
    this.waffleMusic.song(msg).then((wr) => wr.reply(msg));
  }

  executeTop(msg, args) {
    this.gatsScraper.top(args).then((wr) => wr.reply(msg));
  }

  executeTopFive(msg) {
    this.gatsScraper.getTopFive().then((wr) => wr.reply(msg));
  }

  executeUnpause(msg) {
    this.waffleMusic.unpause(msg).then((wr) => wr.reply(msg));
  }
}

module.exports = MessageHandler;
