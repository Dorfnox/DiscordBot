const ArgumentHandler = require("./ArgumentHandler");
const {
  getCategoryCmds,
  logger,
  randomFromArray,
  sendChannel,
} = require("../util/WaffleUtil");
const { link: inviteLink, botImgUrl } = require("../../configWaffleBot").invite;
const { cmdCategory, prefixes } = require("../../commands");

class GenericResponse {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.argHandler = new ArgumentHandler()
      .addCmdsForCategory("General", "Avatar", (msg) => this.avatar(msg))
      .addCmdsForCategory("General", "Drip", () => this.drip())
      .addCmdsForCategory("General", "Feed", () => this.feed())
      .addCmdsForCategory("General", "Help", (msg, args) => this.help(args))
      .addCmdsForCategory("General", "How", (msg, args) => this.how(args))
      .addCmdsForCategory("General", "Invite", () => this.invite())
      .addCmdsForCategory("General", "Nani", () => this.nani())
      .addCmdsForCategory("General", "Ping", (msg) => this.ping(msg))
      .addCmdsForCategory("General", "Salt", () => this.salt())
      .addCmdsForCategory("General", "Say", (msg, args) => this.say(msg, args))
      .addCmdsForCategory("General", "SuperSay", (msg, args) =>
        this.superSay(msg, args)
      )
      .addCmdsForCategory("General", "Statistics", () => this.statistics());
    this.helpArgHandler = new ArgumentHandler().addCmds(
      cmdCategory.map((cc) => cc.category)
    );
    this.howEnum = {
      KENDRON: 1,
      CONTACT: 2,
      MEADOW: 3,
      DORFNOX: 4,
      BFF: 5,
      DXL: 6,
      DRIPZ: 7,
      FEFE: 8,
    };
    this.howArgHandler = new ArgumentHandler()
      .addCmd("old is kendron", this.howEnum.KENDRON, true)
      .addCmd("old is contact", this.howEnum.CONTACT, true)
      .addCmds(
        ["old is meadow", "old is meadowvoid"],
        this.howEnum.MEADOW,
        true
      )
      .addCmds(["old is dorfnox", "old is dorf"], this.howEnum.DORFNOX, true)
      .addCmd("old is bff", this.howEnum.BFF, true)
      .addCmds(["old is dxl", "old is keys"], this.howEnum.DXL, true)
      .addCmds(
        ["old is drips", "old is dripz", "old is driipz"],
        this.howEnum.DRIPZ,
        true
      )
      .addCmd("old is fefe", this.howEnum.FEFE, true);
    this.ready = true;
    console.log("✅ GenericResponse is ready.");
  }

  static messageConsumer(msg, args) {
    // Initialize context
    const { guild, channel, content } = msg;
    const { name: guildName } = guild;
    const { name: channelName } = channel;
    const { username } = msg.author;
    const ctx = { guildName, username, content, err: null };

    // Exit if not initialized
    if (!this.ready) {
      ctx.err = `Feature is down at the moment`;
      return sendChannel(channel, { description: ctx.err }, ctx);
    }

    // Collect arguments
    const parseRes = this.argHandler.parseArguments(args);
    if (!parseRes.exists) {
      return;
    }

    // Execute argument function
    parseRes
      .value(msg, ArgumentHandler.removeArgs(args, parseRes.parseLength))
      .then((embed) => {
        if (typeof embed === "string") {
          logger(guildName, channelName, username, content);
          return msg.channel.send(embed).catch(console.log);
        }
        sendChannel(channel, embed, ctx);
      })
      .catch((err) => {
        ctx.err = err;
        sendChannel(channel, { description: ctx.err }, ctx);
      });
  }

  static avatar(msg) {
    const { mentions } = msg;
    const embed = {
      description: "",
      image: {
        url: "",
      },
    };
    if (!mentions.users.size) {
      embed.description =
        "⚠️ Please mention a member in the server, for example @Dorfnox.";
    } else {
      embed.image.url = mentions.users.first().displayAvatarURL({ size: 256 });
    }
    return Promise.resolve(embed);
  }

  static drip() {
    const description = "Driiiiiiiiiiiiip";
    return Promise.resolve({ description });
  }

  static feed() {
    const description = "OMNOMOMNOMOMNOM";
    return Promise.resolve({ description });
  }

  static help(helpArg) {
    const parseArg = this.helpArgHandler.parseArguments(helpArg);
    let title, description;
    if (parseArg.exists) {
      helpArg = helpArg.replace(/\s.*/, "");
      const cmdObj = getCategoryCmds(helpArg);
      title = `${cmdObj.category} | ${cmdObj.description}`;
      description = cmdObj.cmdSubCategory
        .filter((csc) => !csc.hideFromHelp)
        .map((csc) => {
          return `**${csc.name}**
          ${csc.description}
          > \`${csc.cmds.join("`, `")}\``;
        })
        .join("\n\n");
    } else {
      title = "Help | Try 'w help *category*' for further help";
      description = cmdCategory
        .map((cc) => {
          return `**${cc.category}**
          > ${cc.description}`;
        })
        .join("\n\n");
    }
    const url = `https://www.youtube.com/watch?v=ZZ5LpwO-An4`;
    const footer = {
      text: `Waffle prefixes: ${prefixes.join(", ")}`,
    };
    return Promise.resolve({ url, title, description, footer });
  }

  static how(howArgs) {
    console.log(howArgs);
    return new Promise((resolve, reject) => {
      const howArg = this.howArgHandler.parseArguments(howArgs);
      if (howArg.exists) {
        let description;
        switch (howArg.value) {
          case this.howEnum.KENDRON:
            description = "Kendron is a baby boi!";
            break;
          case this.howEnum.CONTACT:
            description = `Contact is ${randomFromArray([8, 9, 10, 11, 12])}`;
            break;
          case this.howEnum.MEADOW:
            description = `Meadow is a boomer. Also, her real name is **${randomFromArray(
              [
                "Megan",
                "Stacey",
                "Rose",
                "Sir Arthur Ignatius Conan Doyle",
                "Joe",
                "Charlotte",
                "your mum, lol",
              ]
            )}**.`;
            break;
          case this.howEnum.DORFNOX:
            description = `Dorfnox is a Waffle God. His age is known to no one. It is as timeless as a river of stars, flowing into an eternal abyss. jk he 28 lol.`;
            break;
          case this.howEnum.BFF:
            description = `I dunno, ask him.`;
            break;
          case this.howEnum.DXL:
            description = `⚠️ Sorry - this feature is unavailable as dxl has quit playing gats.`;
            break;
          case this.howEnum.DRIPZ:
            description = `DRIIIIIIIIIPZ`;
            break;
          case this.howEnum.FEFE:
            description = `Fefe is a fully grown adult. *Don't let his lies fool you.*`;
            break;
          default:
            description = "?";
            break;
        }
        resolve({ description });
      }
      reject("⚠️ Try 'w how old is Kendron'");
    });
  }

  static invite() {
    const author = {
      name: "WaffleBot",
      url: inviteLink,
      icon_url: botImgUrl,
    };
    const title = `Invite **WaffleBot** to your Server`;
    const url = inviteLink;
    const description =
      `\n> See various Gats Stats for players, clans, most kills, best snipers, etc...` +
      "\n\n> See the top five players on the gats leaderboard, along with fun facts!" +
      "\n\n> Play/queue music." +
      "\n\n> Enable WaffleBot to keep a channel clean of all bot messages." +
      "\n\n> DM WaffleBot for a direct line to server staff, similar to mod mail." +
      "\n\n... and plenty more features!\n";
    const footer = {
      icon_url:
        "https://avatars3.githubusercontent.com/u/4779114?s=460&u=6c94cfa74ecf585f755eb0bb22a061b79b29bbf5&v=4",
      text:
        "WaffleBot created by Dorfnox | https://github.com/Dorfnox/DiscordBot",
    };
    return Promise.resolve({ author, title, url, description, footer });
  }

  static nani() {
    const description =
      "*Nani the fuck did you just fucking iimasu about watashi, you chiisai bitch desuka? Watashi'll have anata know that watashi graduated top of my class in Nihongo 3, and watashi've been involved in iroirona Nihongo tutoring sessions, and watashi have over sanbyaku perfect test scores. Watashi am trained in kanji, and watashi is the top letter writer in all of southern California. Anata are nothing to watashi but just another weeaboo. Watashi will korosu anata the fuck out with vocabulary the likes of which has neber meen mimasu'd before on this continent, mark watashino fucking words. Anata thinks that anata can get away with hanashimasing that kuso to watashi over the intaaneto? Omou again, fucker. As we hanashimasu, watashi am contacting watashino secret netto of otakus accross the USA, and anatano IP is being traced right now so you better junbishimasu for the ame, ujimushi. The ame that korosu's the pathetic chiisai thing anata calls anatano life. You're fucking shinimashita'd, akachan.*";
    return Promise.resolve({ description });
  }

  static ping(msg) {
    const description = `PONG! Your ping is **${
      Date.now() - msg.createdAt.getTime()
    }ms**`;
    return Promise.resolve({ description });
  }

  static salt() {
    const saltReplies = [
      `:salt:`,
      `WHY ARE YOU BEING SO SALTY`,
      `https://www.youtube.com/watch?v=qDjPCMs7ivU`,
      `https://www.youtube.com/watch?v=xzpndHtdl9A`,
      `http://files.explosm.net/comics/Rob/soup.png`,
      `https://www.amazon.com/Morton-Salt-Regular-26/dp/B0005ZV1CQ`,
      `https://live.staticflickr.com/3953/15738368411_266702863c_b.jpg`,
      `https://ih0.redbubble.net/image.500606301.2517/raf,750x1000,075,t,fafafa:ca443f4786.u1.jpg`,
    ];
    return Promise.resolve(randomFromArray(saltReplies));
  }

  static say(msg, args) {
    let description;
    if (!args) {
      description =
        "Can't repeat what isn't said, you naughty, naughty person.";
    } else if (Math.random() > 0.14) {
      description = args;
    } else {
      description = "😜 Sorry, I'm not saying that... I don’t speak bullshit.";
    }
    return Promise.resolve({ description });
  }

  static superSay(msg, description) {
    if (!description) {
      return Promise.resolve({
        description: "⚠️ Nothing for waffle to supersay ？_？",
      });
    }
    return msg
      .delete()
      .then(() => {
        return { description };
      })
      .catch((err) => {
        console.log("superSay Err:", err);
        throw "⚠️ Meanie Staff haven't given me permission to remove your messages :P";
      });
  }

  static statistics() {
    const { uptime, guilds, user } = this.discordClient;
    const guildCount = guilds.cache.size;
    const uptimeSeconds = (uptime || 0) / 1000;
    const seconds = Math.floor(uptimeSeconds % 60);
    const minutes = Math.floor((uptimeSeconds / 60) % 60);
    const hours = Math.floor(uptimeSeconds / 3600);
    const time = `${hours}h ${minutes}m ${seconds}s`;
    const inline = true;

    const thumbnail = {
      url: user.displayAvatarURL({ size: 64 }),
    };
    const title = "WaffleBot Statistics";
    const fields = [
      { name: "# of Servers", value: guildCount, inline },
      { name: "uptime", value: time, inline },
    ];
    return Promise.resolve({ thumbnail, title, fields });
  }
}

module.exports = GenericResponse;
