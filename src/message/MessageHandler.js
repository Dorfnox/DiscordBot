const Discord = require("discord.js");
const Pokemon = require("../pokemon/Pokemon");
const WaffleMail = require("../mail/WaffleMail");
const WaffleMusic = require("../music/WaffleMusic");
const GatsScraper = require("../gats/GatsScraper");
const OwnerCommands = require("../owner/OwnerCommands");
const ArgumentHandler = require("./ArgumentHandler");
const GenericResponse = require("../message/GenericResponse");
const YoutubeDownloader = require("../music/YoutubeDownloader");
const GuildSettingsManager = require("../data-managers/GuildSettingsManager");
const TwitchChannelManager = require("../data-managers/TwitchChannelManager");
const {
  getSafe,
  logger,
  randomFromArray,
  sendChannel,
} = require("../util/WaffleUtil");
const { modMail } = require("../../configWaffleBot.json");
const { prefixes } = require("../../commands");
const { modMailChannelCategoryName } = modMail;

class MessageHandler {
  constructor(discordClient) {
    this.waffleMail = new WaffleMail(discordClient);
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
        OwnerCommands.messageConsumer(msg, args)
      )
      .addCmdsForCategory("Pokemon", null, (msg, args) =>
        Pokemon.messageConsumer(msg, args)
      )
      .addCmdsForCategory("3rdPartyIntegrations", null, (msg, args) =>
        TwitchChannelManager.messageConsumer(msg, args)
      )
      // Top-Secret Commands!
      .addCmds(["download", "dld", "dl"], (msg, args) =>
        YoutubeDownloader.messageConsumer(msg, args)
      );
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
    sendChannel(
      channel,
      { description },
      { guildName, username, content, err: "Bad args" }
    );
  }
}

module.exports = MessageHandler;
