const Discord = require("discord.js");
const GatsScraper = require("../gats/GatsScraper");
const GenericResponse = require("../message/GenericResponse");
const WaffleMusic = require("../music/WaffleMusic2");
const YoutubeDownloader = require("../music/YoutubeDownloader");
const Pokemon = require("../pokemon/Pokemon");
const WaffleMail = require("../mail/WaffleMail");
const OwnerCommands = require("../owner/OwnerCommands");
const GuildSettingsManager = require("../data-managers/GuildSettingsManager");
const TwitchChannelManager = require("../data-managers/TwitchChannelManager");
const ArgumentHandler = require("./ArgumentHandler");
const {
  getSafe,
  logger,
  randomFromArray,
  sendChannel,
} = require("../util/WaffleUtil");
const config = require("../../configWaffleBot.json");
const { prefixes } = config.chat;
const { modMailChannelCategoryName } = config.modMail;

class MessageHandler {
  constructor(client) {
    this.client = client;
    this.gatsScraper = new GatsScraper();
    this.pokemon = new Pokemon();
    this.waffleMail = new WaffleMail(client);
    this.cmdHandler = new ArgumentHandler()
      .addCmdsForCategory("Admin", null, (msg, args) =>
        GuildSettingsManager.messageConsumer(msg, args)
      )
      .addCmdsForCategory("General", null, (msg, args) =>
        GenericResponse.messageConsumer(msg, args)
      )
      .addCmdsForCategory("Music", null, (msg, args) =>
        WaffleMusic.messageConsumer(msg, args)
      )
      .addCmdsForCategory("Owner", null, (msg, args) =>
        OwnerCommands.setStatus(msg, args)
      )
      .addCmdsForCategory("3rdPartyIntegrations", null, (msg, args) =>
        TwitchChannelManager.messageConsumer(msg, args)
      )
      // Top-Secret Commands!
      .addCmds(["download", "dld", "dl"], (msg, args) =>
        YoutubeDownloader.messageConsumer(msg, args)
      );
    this.commands = {
      clanstats: {
        name: "Clanstats",
        execute: this.executeClanstats,
        description: `Displays the stats of a clan (eg: 'w clanstats kcgo').`,
        aliases: ["cs"],
      },
      playerstats: {
        name: "PlayerStats",
        execute: this.executePlayerstats,
        description:
          "Displays the stats of a player (eg: w playerstats dorfnox).",
        aliases: ["ps"],
      },
      "p!hint": {
        name: "p!hint",
        execute: (msg) => this.pokemon.processNextPokeBotMessage(msg),
        description: `Run 'w p!hint' before running 'p!hint' for a little ***more*** help.`,
      },
      top: {
        name: "Top",
        execute: this.executeTop,
        description:
          "Returns top clans, best snipers, highest scores, etc... eg: w best snipers",
        aliases: ["best", "highest", "most", "longest"],
      },
      top5: {
        name: "Top5",
        execute: this.executeTopFive,
        description: "Get the top five players from the gats leaderboard.",
      },
    };
  }

  handleMessage(msg) {
    const { content, guild, channel, author } = msg;
    const { bot: isBot } = author;

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
    if (!prefixes.some((prefix) => prefixCheck.startsWith(`${prefix} `))) {
      return;
    }

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

    // No existing command found.
    const replies = [
      `That doesn't make any sense!`,
      "The heck are you expecting me to do?",
      "I know what you did last summer.",
    ];
    const description = randomFromArray(replies);
    const { name: guildName } = guild;
    const { username } = author;
    sendChannel(channel, { description }, { guildName, username, content, err: 'Bad args' });
  }

  executeClanstats(msg, args) {
    this.gatsScraper.clanstats(args).then((wr) => wr.reply(msg));
  }

  executePlayerstats(msg, args) {
    this.gatsScraper.playerstats(args).then((wr) => wr.reply(msg));
  }

  executeTop(msg, args) {
    this.gatsScraper.top(args).then((wr) => wr.reply(msg));
  }

  executeTopFive(msg) {
    this.gatsScraper.getTopFive().then((wr) => wr.reply(msg));
  }
}

module.exports = MessageHandler;
