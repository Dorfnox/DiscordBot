const WaffleResponse = require("../message/WaffleResponse");
const ServerMailController = require("./ServerMailController");
const {
  modMailChannelCategoryName,
} = require("../../configWaffleBot.json").modMail;

class WaffleMail {
  static channelSliceLength = (modMailChannelCategoryName.length + 1) * -1;
  static discriminatorLength = 4;

  constructor(client) {
    this.client = client;
    this.serverMailController = new ServerMailController(client);
  }

  handleDM(msg) {
    // Validate user already has an existing mod mail open.
    this.serverMailController
      .init(msg)
      .then((userController) => {
        const { textChannel } = userController;
        textChannel.send({
          embed: {
            color: "#ffffff",
            description: msg.content,
          },
        });
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
    const { channel, guild } = msg;
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
        m.user.username.toLowerCase() === username &&
        m.user.discriminator === discriminator
    );
    if (guildMember) {
      const description = `**${msg.author.username}**\n${msg.content}`;
      guildMember
        .send({
          embed: {
            color: "#fad6a5", // Deep Champagne
            description,
          },
        })
        .then((sentMsg) => {
          this.serverMailController
            .initForAuthorDmChannelAndGuild(guildMember.user, sentMsg.channel, guild)
            .catch((err) => console.log(error));
        });
    } else {
      channel
        .send({
          embed: {
            color: "#ff0028", // Ruddy
            description: `Unfortunately, ${username} no longer appears active in ${guild.name}`,
          },
        })
        .catch((err) => console.log(err));
    }
  }
}

module.exports = WaffleMail;
