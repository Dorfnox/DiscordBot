const ArgumentHandler = require("../message/ArgumentHandler");
const {
  getNumberFromArguments,
  isOwner,
  paginateArray,
  sendChannel,
  zeroWidthSpaceChar: z,
} = require("../util/WaffleUtil");

class OwnerCommands {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.ownerArgs = new ArgumentHandler()
      .addCmdsForCategory("Owner", "SetStatus", (args) => this.setStatus(args))
      .addCmdsForCategory("Owner", "Servers", (args) => this.servers(args));
    this.ready = true;
    console.log("✅ OwnerCommands is ready.");
  }

  static messageConsumer(msg, args) {
    // Initialize context
    const { guild, channel, member, content } = msg;
    const { name: guildName } = guild;
    const { username } = msg.author;
    const ctx = { guildName, username, content, err: null };

    // Validate executeability
    if (!this.ready) {
      ctx.err = `Feature is down at the moment`;
      return sendChannel(channel, { description: ctx.err }, ctx);
    } else if (!isOwner(member)) {
      ctx.err = `🚫 Only the bot's owner has access to this command`;
      return sendChannel(channel, { description: ctx.err }, ctx);
    }

    // Parse out arguments
    const parseRes = this.ownerArgs.parseArguments(args);
    if (!parseRes.exists) {
      return;
    }
    parseRes
      .value(ArgumentHandler.removeArgs(args, parseRes.parseLength))
      .then((embed) => sendChannel(channel, embed, ctx))
      .catch((err) => {
        ctx.err = err;
        sendChannel(channel, embed, ctx);
      });
  }

  static setStatus(status) {
    this.discordClient.user
      .setPresence({
        activity: { name: status, type: "PLAYING" },
      })
      .catch((err) => {
        console.log("setPresence err:", err);
      });
    const description = `**New Actvity Status**\n(>^_^)> \`${z}${status}\``;
    return Promise.resolve({ description });
  }

  static servers(args) {
    const guildNames = this.discordClient.guilds.cache
      .array()
      .map((g) => g.name);
    const pageSize = 25;
    const pageCount = Math.ceil(guildNames.length / pageSize);
    const pageArg = Math.min(getNumberFromArguments(args) || 1, pageCount);
    const sp = ` ${zeroWidthSpaceChar} `;

    const title = "Servers WaffleBot is in";
    const description = paginateArray(guildNames, pageArg, pageSize).join("\n");
    const footer = {
      text: `📘 Page ${pageArg} of ${pageCount} ${sp} | ${sp} w servers pageNumber`,
    };
    return Promise.resolve({ title, description, footer });
  }
}

module.exports = OwnerCommands;
