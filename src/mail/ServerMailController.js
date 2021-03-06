const WaffleResponse = require("../message/WaffleResponse");
const { getNumberFromArguments, isStaff } = require("../util/WaffleUtil");
const { zeroWidthSpaceChar } = require("../util/WaffleUtil");
const {
  modMailChannelCategoryName,
  openChannelUptimeInSeconds,
  roleName,
} = require("../../configWaffleBot.json").modMail;

// Note: Only 1 open channel will exist per user.
// They will have to wait openChannelUptimeInSeconds to message a different channel
class ServerMailController {
  constructor(client) {
    this.openUserController = new Map();
    this.client = client;
  }

  hasOpenChannel(authorId) {
    return this.openUserController.has(authorId);
  }

  setOpenChannel(authorId, userControl) {
    return this.openUserController.set(authorId, userControl);
  }

  getOpenChannel(authorId) {
    return this.openUserController.get(authorId);
  }

  deleteOpenChannel(authorId) {
    return this.openUserController.delete(authorId);
  }

  init(msg) {
    return this.initForAuthorDmChannelAndGuild(msg.author, msg.channel);
  }

  initForAuthorDmChannelAndGuild(author, dmChannel, guild = null) {
    const { id: authorId } = author;
    if (this.hasOpenChannel(authorId)) {
      let uc = this.getOpenChannel(authorId);
      if (!uc.complete) {
        return Promise.reject();
      } else if (guild && uc.guild.id !== guild.id) {
        return Promise.reject(
          `🚫 ${author.name} is currently speaking with a different guild. Try again in a few minutes.`
        );
      }
      this._resetIdleTimer(uc);
      return Promise.resolve(uc);
    }
    const userControl = {
      author,
      guild,
      role: null,
      staff: null,
      categoryChannel: null,
      textChannel: null,
      dmChannel,
      complete: false,
      selfDestructTimeout: null,
    };
    this.setOpenChannel(authorId, userControl);
    return this._determineGuild(userControl)
      .then((guild) => {
        userControl.guild = guild;
        return this._determineRole(userControl);
      })
      .then((role) => {
        userControl.role = role;
        return this._determineStaff(userControl);
      })
      .then((staff) => {
        userControl.staff = staff;
        return this._determineCategoryChannel(userControl);
      })
      .then((categoryChannel) => {
        userControl.categoryChannel = categoryChannel;
        return this._determineTextChannel(userControl);
      })
      .then((textChannel) => {
        // Reset Self Destruct Timeout
        this._resetIdleTimer(userControl);

        // Return userControl
        userControl.textChannel = textChannel;
        userControl.complete = true;
        return userControl;
      })
      .catch((err) => {
        this.deleteOpenChannel(authorId);
        // Log error
        new WaffleResponse()
          .setError(err)
          .setErrorLocale("Server Mail Controller init method")
          .reply();
        const description = !err.message
          ? err
          : "An **issue** occurred while attempting to contact the mods. It may be due to one of the following reasons:\n beta bug, permissions, etc...";
        return Promise.reject(description);
      });
  }

  /**
   *  GUILD control methods ~~~~~~~~~~~~~~~~~~~~~~~
   */

  _determineGuild(userControl) {
    const { guild, author } = userControl;
    // Exit early if we have stored the guild.
    if (guild) {
      return Promise.resolve(guild);
    }
    // Compare bot vs user guilds, and return ideal guild.
    return this._getSharedGuilds(author).then((sharedGuilds) => {
      if (sharedGuilds) {
        if (sharedGuilds.size > 1) {
          return this._queryUserForGuild(userControl, sharedGuilds);
        } else if (sharedGuilds && sharedGuilds.size === 1) {
          return sharedGuilds.first();
        }
      }
      return Promise.reject(
        `You don't seem to share any guilds with this bot!`
      );
    });
  }

  _getSharedGuilds(author) {
    return Promise.resolve(
      this.client.guilds.cache.filter((g) => g.members.resolve(author.id))
    );
  }

  _queryUserForGuild(userControl, sharedGuilds) {
    const { dmChannel } = userControl;
    const sharedGuildArray = [...sharedGuilds.values()];
    const title = "Welcome to WaffleMail!";
    const thumbnail = {
      url: this.client.user.displayAvatarURL({ dynamic: true, size: 128 }),
    };
    const description =
      `This feature is designed for you to talk directly with staff of a server. First, **select a server** by replying with the provided #:\n\n` +
      sharedGuildArray
        .map((v, i) => {
          return `\`${i + 1}\` **${v.name}** - ${v.memberCount} members`;
        })
        .join("\n")
        .concat(
          `\n\n**General Guidelines**:\n>>> ` +
            `Communication is open until ***${openChannelUptimeInSeconds} seconds*** of idle time elapses.\n` +
            `You will not be able to open a staff chat with a different server until this time elapses.\n` +
            `Do no abuse this feature - pinging of anyone **is** disabled.`
        );
    return dmChannel
      .send({
        embed: {
          title,
          thumbnail,
          description,
        },
      })
      .then(() =>
        this._handleQueryUserForGuildRespones(userControl, sharedGuildArray)
      );
  }

  _handleQueryUserForGuildRespones(userControl, sharedGuildArray) {
    return new Promise((resolve, reject) => {
      const { author, dmChannel } = userControl;

      // Create message collector
      const msgFilter = (m) => m.author.id === author.id;
      const collector = dmChannel.createMessageCollector(msgFilter, {
        idle: openChannelUptimeInSeconds * 1000,
      });

      // Process bot message on collection
      collector.on("collect", (m) => {
        const { content } = m;
        const numArg = getNumberFromArguments(content, true);
        if (!(numArg && numArg < sharedGuildArray.length + 1)) {
          return;
        }
        collector.stop("guildSelected");
        const sharedGuild = sharedGuildArray[numArg - 1];
        dmChannel
          .send({
            embed: {
              description: `**${sharedGuild.name}** staff members can now communicate with you from here :champagne:\n*Your initial message was sent to the server.*`,
            },
          })
          .then(() => resolve(sharedGuild))
          .catch((e) => {
            console.log(e);
            reject('Could not send message to DM channel');
          });
      });

      // Process ending of this message collector
      collector.on("end", (_, reason) => {
        if (reason !== "guildSelected") {
          reject("*You have timed out... please retry.*");
        }
      });
    });
  }

  /**
   *  ROLE control methods ~~~~~~~~~~~~~~~~~~~~~~~
   */

  _determineRole(userControl) {
    let { guild, role } = userControl;
    if (role) {
      return Promise.resolve(role);
    }
    role = guild.roles.cache.find(
      (r) => r.name === roleName && r.deleted === false
    );
    if (role) {
      return Promise.resolve(role);
    }
    return guild.roles.create({
      data: {
        name: roleName,
        color: "#fad89f", // Belgian Waffle Color
      },
      reason: `This staff-role allows a guild member to access WaffleBot's ${modMailChannelCategoryName} mod mail`,
    });
  }

  /**
   *  STAFF control methods ~~~~~~~~~~~~~~~~~~~~~~~
   */

  _determineStaff(userControl) {
    let { guild, staff, role } = userControl;
    if (staff && staff.every((s) => s.roles.cache.has(role.id))) {
      return Promise.resolve(staff);
    }
    staff = guild.members.cache.filter((m) => isStaff(m));
    if (staff) {
      staff.each((s) => {
        if (!s.roles.cache.has(role.id)) {
          s.roles.add(
            role,
            `Staff members require the ${roleName} role to access WaffleBot's ${modMailChannelCategoryName} mod mail`
          );
        }
      });
      return Promise.resolve(staff);
    }
    return Promise.reject(
      `Apparently, there are no staff in ${guild.name} who can help :/ ...`
    );
  }

  /**
   *  CHANNEL control methods ~~~~~~~~~~~~~~~~~~~~~~~
   */

  _determineCategoryChannel(userControl) {
    let { guild, role, categoryChannel } = userControl;
    if (categoryChannel) {
      return Promise.resolve(categoryChannel);
    }
    categoryChannel = guild.channels.cache.find(
      (ch) =>
        ch.type === "category" &&
        ch.deleted === false &&
        ch.name === modMailChannelCategoryName
    );
    if (categoryChannel) {
      return Promise.resolve(categoryChannel);
    }
    return guild.channels.create(modMailChannelCategoryName, {
      type: "category",
      topic: "WaffleBot's ModMail category channel",
      position: guild.channels.cache.size,
      reason:
        "Created Category channel due to a DM from a user without it existing",
      permissionOverwrites: [
        {
          id: guild.id,
          deny: ["VIEW_CHANNEL"],
        },
        {
          id: this.client.user.id,
          allow: ["VIEW_CHANNEL"],
        },
        {
          id: role.id,
          allow: ["VIEW_CHANNEL"],
        },
      ],
    });
  }

  _determineTextChannel(userControl) {
    let { author, guild, role, textChannel, categoryChannel } = userControl;
    if (textChannel) {
      return Promise.resolve(textChannel);
    }
    const channelName = `${author.username.replace(/\s/g, "-")}${
      author.discriminator
    }-${modMailChannelCategoryName}`.toLowerCase();
    textChannel = guild.channels.cache.find(
      (ch) =>
        ch.type === "text" && ch.deleted === false && ch.name === channelName
    );
    if (textChannel) {
      return Promise.resolve(textChannel);
    }
    return guild.channels
      .create(channelName, {
        type: "text",
        topic: `Staff discussion for @${author.username}#${author.discriminator}`,
        position: guild.channels.cache.size,
        reason: `Staff discussion for @${author.username}#${author.discriminator} issue`,
        parent: categoryChannel,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ["VIEW_CHANNEL", "MENTION_EVERYONE"],
          },
          {
            id: this.client.user.id,
            allow: ["VIEW_CHANNEL"],
          },
          {
            id: role.id,
            allow: ["VIEW_CHANNEL"],
          },
        ],
      })
      .then((newChannel) => {
        const color = "#a7a9ff"; // Light blue
        const title = `WaffleMail chat for ${author.username}`;
        const description =
          `This channel was automatically opened for correspondance with ${author.username}.` +
          `\n\nYou can close this open channel at any time with:\n**w close here is my reason**.`;
        const thumbnail = {
          url: author.displayAvatarURL({ dynamic: true, size: 128 }),
        };
        return newChannel
          .send({
            embed: { color, title, description, thumbnail },
          })
          .then(() => newChannel);
      });
  }

  _resetIdleTimer(userControl) {
    if (userControl.selfDestructTimeout) {
      clearTimeout(userControl.selfDestructTimeout);
    }
    userControl.selfDestructTimeout = setTimeout(() => {
      const { author, guild } = userControl;
      this.deleteOpenChannel(author.id);
      const description = `Your chat session with **${guild.name}** has ended.\nThank you for using WaffleMail ${zeroWidthSpaceChar} :wave: :waffle:`;
      userControl.author
        .send({ embed: { description } })
        .catch((err) => console.log(err));
    }, openChannelUptimeInSeconds * 1000);
  }
}

module.exports = ServerMailController;
