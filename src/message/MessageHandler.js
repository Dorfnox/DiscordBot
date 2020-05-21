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
    this.pokemon = new Pokemon();
    this.waffleMail = new WaffleMail(client);
    this.cmdHandler = new ArgumentHandler()
      .addCmdsForCategory("Admin", null, (msg, args) =>
        GuildSettingsManager.messageConsumer(msg, args)
      )
      .addCmdsForCategory("Gats", null, (msg, args) =>
        GatsScraper.messageConsumer(msg, args)
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
      "p!hint": {
        name: "p!hint",
        execute: (msg) => this.pokemon.processNextPokeBotMessage(msg),
        description: `Run 'w p!hint' before running 'p!hint' for a little ***more*** help.`,
      },
    };
  }

  handleMessage(msg) {
    const { content, guild, channel, author } = msg;
    const { bot: isBot, username } = author;

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
    } else {
      // No existing command found.
      const replies = [
        `That doesn't make any sense!`,
        "The heck are you expecting me to do?",
        "I know what you did last summer.",
      ];
      const description = randomFromArray(replies);
      const { name: guildName } = guild;
      sendChannel(
        channel,
        { description },
        { guildName, username, content, err: "Bad args" }
      );
    }
  }
}

module.exports = MessageHandler;
