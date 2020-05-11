const Discord = require("discord.js");

const GatsScraper = require("../gats/GatsScraper");
const GenericResponse = require("../message/GenericResponse");
const WaffleMusic = require("../music/WaffleMusic");
const WaffleMusic2 = require("../music/WaffleMusic2");
const Pokemon = require("../pokemon/Pokemon");
const WaffleMail = require("../mail/WaffleMail");
const OwnerCommands = require("../owner/OwnerCommands");
const GuildSettingsManager = require("../data-managers/GuildSettingsManager");
const WaffleResponse = require("./WaffleResponse");
const ArgumentHandler = require("./ArgumentHandler");
const {
  arrayFromObjectValues,
  randomFromArray,
} = require("../util/WaffleUtil");
const config = require("../../configWaffleBot.json");
const { prefixes } = config.chat;
const { modMailChannelCategoryName } = config.modMail;

class MessageHandler {
  constructor(client) {
    this.client = client;
    this.genericResponse = new GenericResponse();
    this.waffleMusic = new WaffleMusic(client);
    this.gatsScraper = new GatsScraper();
    this.pokemon = new Pokemon();
    this.waffleMail = new WaffleMail(client);
    this.ownerCommands = new OwnerCommands(client);
    this.cmdHandler = new ArgumentHandler().addCmds(
      [
        "play",
        "p",
        "pause",
        "queue",
        "q",
        "oops",
        "join",
        "j",
        "leave",
        "l",
        "skip",
        "stop",
        "end",
        "finish",
        "repeat",
        "song",
        "unpause",
      ],
      (msg, args) => WaffleMusic2.executeMusicCmd(msg, args)
    );
    this.helpCategory = {
      admin: {
        name: "Admin",
        description: "Commands for admin use only.",
      },
      gats: {
        name: "Gats",
        description: "Queries for gats information.",
      },
      general: {
        name: "General",
        description: "General commands.",
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
      feed: {
        name: "Feed",
        execute: (msg) => this.genericResponse.feed(msg),
        description: "Give wfl waffles!",
        helpCategory: this.helpCategory.general,
      },
      help: {
        name: "Help",
        execute: this.executeHelp,
        description: "Command waffle with waffle|wfl|w|:waffle: + *command*.",
        aliases: ["h"],
        helpCategory: this.helpCategory.general,
      },
      how: {
        name: "How",
        execute: (msg, args) => this.genericResponse.how(msg, args),
        description: "Try 'how old is kendron' to find out Kendron's age!",
        helpCategory: this.helpCategory.general,
      },
      invite: {
        name: "Invite",
        execute: (msg) => this.genericResponse.invite(msg),
        description: "Invite Link to add WaffleBot to your server!",
        aliases: ["inv"],
        helpCategory: this.helpCategory.general,
      },
      join: {
        name: "Join",
        execute: (msg, args) => this.waffleMusic.join(msg, args),
        description: "Provide the name of a VOICE CHANNEL to join.",
        aliases: ["j"],
        helpCategory: this.helpCategory.music,
      },
      nani: {
        name: "Nani",
        execute: (msg) => this.genericResponse.nani(msg),
        description: "UwU notice me senpai.",
        helpCategory: this.helpCategory.general,
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
      ping: {
        name: "Ping",
        execute: (msg) => this.genericResponse.ping(msg),
        description: "Shows the ping in ms between client -> server.",
        helpCategory: this.helpCategory.general,
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
      salt: {
        name: "Salt",
        execute: (msg) => this.genericResponse.salt(msg),
        description: "Just why?",
        helpCategory: this.helpCategory.general,
      },
      say: {
        name: "Say",
        execute: (msg, args) => this.genericResponse.say(msg, args),
        description: "I will repeat what you say :D",
        helpCategory: this.helpCategory.general,
      },
      screwbots: {
        name: "ScrewBots",
        execute: (msg) => GuildSettingsManager.screwbots(msg),
        description: "Removes all bot messages from invoked channel.",
        aliases: ["nobots", "sb"],
        helpCategory: this.helpCategory.admin,
      },
      setstatus: {
        name: "SetStatus",
        execute: (msg, args) => this.ownerCommands.setStatus(msg, args),
        description: "Sets the status of the bot, globally",
        aliases: ["ss"],
        helpCategory: this.helpCategory.owner,
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
      unscrewbots: {
        name: "UnScrewBots",
        execute: (msg) => GuildSettingsManager.unscrewbots(msg),
        description:
          "Allows bots to again post messages in a channel if they have been previously screwed.",
        aliases: ["yesbots", "usb"],
        helpCategory: this.helpCategory.admin,
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
    const { content, guild, author } = msg;
    const { bot: isBot } = author;
    const wr = new WaffleResponse();

    if (!author) {
      return;
    }

    // Handle Direct Mod-Mail Messages
    if (!isBot && !guild && msg.channel instanceof Discord.DMChannel) {
      return this.waffleMail.handleDM(msg);
    } else if (
      !isBot &&
      msg.channel.parent &&
      msg.channel.parent.name === modMailChannelCategoryName
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

    const pRes = this.cmdHandler.parseArguments(content, true);
    if (pRes.exists) {
      try {
        return pRes.value(msg, ArgumentHandler.removeArgs(content, 1));
      } catch (err) {
        console.log(new Date().toUTCString(), 'Unhandled Exception: ', err);
      }
    }

    // Parse out arguments
    const args = content.trim().split(/\s+/);

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
