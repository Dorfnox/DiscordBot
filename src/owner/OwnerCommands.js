const ArgumentHandler = require("../message/ArgumentHandler");
const { isOwner, sendChannel } = require("../util/WaffleUtil");

class OwnerCommands {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.ownerArgs = new ArgumentHandler().addCmdsForCategory(
      "Owner",
      null,
      (msg, args) => this.setStatus(msg, args)
    );
    this.ready = true;
  }

  static setStatus(msg, args) {
    if (!this.ready || !isOwner(msg.member)) {
      return;
    }
    const parseResult = this.ownerArgs.parseArguments(args);
    if (!parseResult.exists) {
      return ;
    }
    const status = ArgumentHandler.removeArgs(args, parseResult.parseLength);
    this.discordClient.user.setPresence({
      activity: { name: status, type: "PLAYING" },
    }).catch(console.log);
    const { channel, guild, author, content } = msg;
    const { name: guildName } = guild;
    const { username } = author;
    const description = `**New Actvity Status**\n(>^_^)> \`${status}\``;
    sendChannel(channel, { description }, { guildName, username, content });
  }
}

module.exports = OwnerCommands;
