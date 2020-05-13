const WaffleResponse = require("./WaffleResponse");
const {
  getNumberFromArguments,
  paginateArray,
  zeroWidthSpaceChar,
} = require("../util/WaffleUtil");
const ArgumentHandler = require("./ArgumentHandler");
const { link: inviteLink, botImgUrl } = require("../../configWaffleBot").invite;
const {
  getSafe,
  randomFromArray,
  randomMusicEmoji,
} = require("../util/WaffleUtil");

class GenericResponse {
  constructor(discordClient) {
    this.discordClient = discordClient;
  }

  drip(msg) {
    new WaffleResponse().setResponse("Driiiiiiiiiiiiip").reply(msg);
  }

  feed(msg) {
    new WaffleResponse().setResponse("OMNOMOMNOMOMNOM").reply(msg);
  }

  how(msg, args) {
    if (args.join(" ").toLowerCase().startsWith("old is ken")) {
      new WaffleResponse().setResponse("Kendron is a baby boi!").reply(msg);
    }
  }

  invite(msg) {
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
    const image = {
      url: botImgUrl,
    };
    const footer = {
      icon_url:
        "https://avatars3.githubusercontent.com/u/4779114?s=460&u=6c94cfa74ecf585f755eb0bb22a061b79b29bbf5&v=4",
      text:
        "WaffleBot created by Dorfnox | https://github.com/Dorfnox/DiscordBot",
    };
    new WaffleResponse()
      .setEmbeddedResponse({ author, title, url, description, image, footer })
      .reply(msg)
      .catch((err) => console.log(err));
  }

  nani(msg) {
    new WaffleResponse()
      .setResponse(
        "*Nani the fuck did you just fucking iimasu about watashi, you chiisai bitch desuka? Watashi'll have anata know that watashi graduated top of my class in Nihongo 3, and watashi've been involved in iroirona Nihongo tutoring sessions, and watashi have over sanbyaku perfect test scores. Watashi am trained in kanji, and watashi is the top letter writer in all of southern California. Anata are nothing to watashi but just another weeaboo. Watashi will korosu anata the fuck out with vocabulary the likes of which has neber meen mimasu'd before on this continent, mark watashino fucking words. Anata thinks that anata can get away with hanashimasing that kuso to watashi over the intaaneto? Omou again, fucker. As we hanashimasu, watashi am contacting watashino secret netto of otakus accross the USA, and anatano IP is being traced right now so you better junbishimasu for the ame, ujimushi. The ame that korosu's the pathetic chiisai thing anata calls anatano life. You're fucking shinimashita'd, akachan.*"
      )
      .setLogResponseLimit(30)
      .reply(msg);
  }

  ping(msg) {
    new WaffleResponse()
      .setResponse(
        `PONG! Your ping is **${Date.now() - msg.createdAt.getTime()}ms**`
      )
      .reply(msg);
  }

  salt(msg) {
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
    getSafe(() => msg.channel.send(randomFromArray(saltReplies)));
  }

  say(msg, args) {
    let text;
    if (Math.random() > 0.14) {
      text = !args.length
        ? "Can't repeat what isn't said, you naughty, naughty person"
        : args.join(" ");
    } else {
      text = "Sorry, I'm not saying that... I don’t speak bullshit.";
    }
    new WaffleResponse().setResponse(text).reply(msg);
  }

  superSay(msg, args) {
    const text = ArgumentHandler.removeArgs(args, 1);
    if (!text) {
      return;
    }
    msg
      .delete()
      .then(() => {
        new WaffleResponse()
          .setEmbeddedResponse({ description: text })
          .reply(msg);
      })
      .catch((err) => {
        console.log(err);
        const description =
          "⚠️ I don't have permission to remove your message ><";
        new WaffleResponse().setEmbeddedResponse({ description }).reply(msg);
      });
  }

  serverStats(msg) {
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
    new WaffleResponse()
      .setEmbeddedResponse({
        thumbnail,
        title,
        fields,
      })
      .reply(msg);
  }

  serverList(msg, args) {
    const guildNames = this.discordClient.guilds.cache.array().map(g => g.name);
    const pageSize = 25;
    const pageCount = Math.ceil(guildNames.length / pageSize);
    const pageArg = Math.min(
      getNumberFromArguments(ArgumentHandler.removeArgs(args, 1)) || 1,
      pageCount
    );
    const sp = ` ${zeroWidthSpaceChar} `;

    const title = "Servers WaffleBot is in";
    const description = paginateArray(guildNames, pageArg, pageSize).join("\n");
    const footer = {
      text: `📘 Page ${pageArg} of ${pageCount} ${sp} | ${sp} w servers pageNumber`,
    };
    new WaffleResponse()
      .setEmbeddedResponse({ title, description, footer })
      .reply(msg);
  }
}

module.exports = GenericResponse;
