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
    if (!guildMember) {
      return new WaffleResponse()
        .setEmbeddedResponse({
          color: "#ff0028", // Ruddy
          description: `Unfortunately, ${username} no longer appears active in ${guild.name}`,
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
      .then((userController) => {
        return userController.author
          .send({
            embed: {
              color: "#fad6a5", // Deep Champagne
              description: msg.content,
              author: {
                name: msg.member.displayName,
                icon_url: msg.author.displayAvatarURL(),
              },
              footer: {
                text: `Sent from ${guild.name}`
              }
            },
          })
          .catch((err) =>
            new WaffleResponse()
              .setError(err)
              .setEmbeddedResponse({
                description: `Unable to DM ${userController.author.name}. Here was the error: ${err}`,
              })
              .reply(msg)
          );
      })
      .catch((err) =>
        // Catches failure to intialize a DM channel
        new WaffleResponse()
          .setError(err)
          .setEmbeddedResponse({
            description: `🚫 Could not instantiate a DM channel with ${username}`,
          })
          .reply(msg)
      );
  }
}

module.exports = WaffleMail;
