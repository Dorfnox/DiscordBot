const ArgumentHandler = require("../message/ArgumentHandler");
const WaffleResponse = require("../message/WaffleResponse");
const ServerMailController = require("./ServerMailController");
const { zeroWidthSpaceChar } = require("../util/WaffleUtil");
const {
  modMailChannelCategoryName,
} = require("../../configWaffleBot.json").modMail;

class WaffleMail {
  static channelSliceLength = (modMailChannelCategoryName.length + 1) * -1;
  static discriminatorLength = 4;

  constructor(client) {
    this.client = client;
    this.serverMailController = new ServerMailController(client);
    this.closeChannelArgHandler = new ArgumentHandler().addCmds([
      "resolve",
      "close",
      "end",
      "finish",
      "complete",
      "delete",
    ]);
  }

  handleDM(msg) {
    // Validate user already has an existing mod mail open.
    this.serverMailController
      .init(msg)
      .then((userController) => {
        const { textChannel, author } = userController;
        const color = "#906000"; // Rat brown
        const description = `:poop: ${zeroWidthSpaceChar} **${
          author.username
        }**: ${msg.content.replace("@", "@ ")}`;
        return textChannel.send({ embed: { color, description } });
      })
      .catch((err) => {
        if (err) {
          new WaffleResponse()
            .setError(err)
            .setEmbeddedResponse({ description: err })
            .reply(msg);
        }
      });
  }

  handleModChannel(msg) {
    // First figure out the user to DM
    const { channel, guild, content } = msg;
    const user = channel.name.slice(0, WaffleMail.channelSliceLength);
    const discriminator = user.slice(
      user.length - WaffleMail.discriminatorLength,
      user.length
    );
    const username = user.slice(
      0,
      user.length - WaffleMail.discriminatorLength
    );
    const guildMember = guild.members.cache.find(
      (m) =>
        m.user.username.replace(/\s/g, "-").toLowerCase() === username &&
        m.user.discriminator === discriminator
    );
    // Check if we should close the channel
    const pRes = this.closeChannelArgHandler.parseArguments(content, true);
    if (pRes.exists) {
      const reason = ArgumentHandler.removeArgs(content, pRes.parseLength);
      return this._closeChannel(msg, guildMember, reason);
    }
    if (!guildMember) {
      return new WaffleResponse()
        .setEmbeddedResponse({
          color: "#ff0028", // Ruddy
          description: `:no_entry_sign: Unfortunately, ${username} no longer appears active in ${guild.name}. **Close** this channel with 'w close *reason*'.`,
        })
        .reply(msg);
    }
    guildMember.user
      .createDM()
      .then((dmChannel) =>
        this.serverMailController.initForAuthorDmChannelAndGuild(
          guildMember.user,
          dmChannel,
          guild
        )
      )
      .then((userController) => this._handleStaffMsgToUser(msg, userController))
      .catch((err) =>
        // Catches failure to intialize a DM channel
        new WaffleResponse()
          .setError(err)
          .setEmbeddedResponse({
            description: `:no_entry_sign: Could not instantiate a DM channel with ${username}.\nLikely, the user is confirming an operation with WaffleMail at this very moment.`,
          })
          .reply(msg)
      );
  }

  _handleStaffMsgToUser(msg, userController) {
    const { member: staffGuildMember, content } = msg;
    const { author: dmUser } = userController;
    const deletePromise = msg.delete().catch((err) => console.log(err));
    const staffReply = `**${staffGuildMember.displayName}**: ${content}`;
    return Promise.all([deletePromise, dmUser.send(staffReply)])
      .then(() =>
        // Feedback on mod channel to let staff know that message went through
        new WaffleResponse()
          .setEmbeddedResponse({
            description: `:crown: ${zeroWidthSpaceChar} ${staffReply}`,
          })
          .reply(msg)
      )
      .catch((err) =>
        // Catches failure to send a DM
        new WaffleResponse()
          .setError(err)
          .setEmbeddedResponse({
            description: `:no_entry_sign: ${zeroWidthSpaceChar} ${staffReply}\n\n**Unable to DM ${dmUser.name} due to error: ${err}**`,
          })
          .reply(msg)
      );
  }

  _closeChannel(msg, guildMember, reason) {
    if (!reason) {
      const description = "Please provide a reason for closing this channel";
      return new WaffleResponse()
        .setEmbeddedResponse({ description })
        .reply(msg);
    }
    return msg.channel.delete(reason).then(() => {
      if (guildMember) {
        this.serverMailController.deleteOpenChannel(guildMember.user.id);
        const embed = {
          color: "#e2c779",
          description: `🧇 Your issues have been marked as **resolved** by **${msg.member.displayName}** for '${reason}'.\nThank you for using WaffleMail!`,
        };
        return guildMember.user
          .send({ embed })
          .catch((err) => console.log(err));
      }
    });
  }
}

module.exports = WaffleMail;
