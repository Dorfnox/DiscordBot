const Discord = require("discord.js");
const ArgumentHandler = require("../message/ArgumentHandler");
const WaffleResponse = require("../message/WaffleResponse");
const ytdl = require("ytdl-core");
const fs = require("fs");
const { getSafe } = require("../util/WaffleUtil");
const {
  youtubeDownloaders,
  dldFolder,
} = require("../../configWaffleBot").music;

class YoutubeDownloader {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.ytArgMap = new ArgumentHandler().addCmds(
      ["download", "dld", "dl"],
      (msg, args) => this.download(msg, args)
    );
    this.busy = false;
    this.fileName = "RenameMe.m4a";
    this.filePath = `${dldFolder}${this.fileName}`;
    this.ready = true;
    console.log("✅ YoutubeDownloader is ready.");
  }

  static messageConsumer(msg, args) {
    if (!this.ready) {
      return new WaffleResponse()
        .setEmbeddedResponse({
          description: "⚠️ Wait a second!",
        })
        .reply(msg);
    } else if (youtubeDownloaders.indexOf(msg.author.id) === -1) {
      return new WaffleResponse()
        .setEmbeddedResponse({
          description: "🔥 You aren't MeadowVoid. You can't do that 🔥",
        })
        .reply(msg);
    } else if (this.busy) {
      return new WaffleResponse()
        .setEmbeddedResponse({
          description: "⚠️ Already downloading something. Please be patient",
        })
        .reply(msg);
    }

    const pRes = this.ytArgMap.parseArguments(args);
    pRes
      .value(msg, ArgumentHandler.removeArgs(args, pRes.parseLength))
      .then((res) => {
        if (res) {
          new WaffleResponse()
            .setEmbeddedResponse({ description: res })
            .reply(msg);
        }
      })
      .catch((err) => {
        if (err) {
          const description = err.message ? err.message : err;
          new WaffleResponse().setEmbeddedResponse({ description }).reply(msg);
        }
      });
  }

  static download(msg, args) {
    return new Promise((resolve, reject) => {
      this.busy = true;
      const ytLink = getSafe(() => args.split(/\s+/g).filter((a) => a)[0], "");
      if (!ytdl.validateURL(ytLink)) {
        return reject(
          `⚠️ Invalid Youtube URL **${
            ytLink || "...you didn't give me anything bruh..."
          }** - Plz give me a youtube link`
        );
      }

      const timeout = setTimeout(() => {
        this.busy = false;
        reject("Timeout of 15 seconds exceeded. Please try again");
      }, 60000);

      const writeableStream = ytdl(ytLink, {
        filter: "audioonly",
        quality: 140,
      }).pipe(fs.createWriteStream(`${this.filePath}`));

      writeableStream.on("close", () => {
        clearTimeout(timeout);
        this.busy = false;
        this.onEnd(msg).then((res) => resolve(res));
      });
      writeableStream.on("error", (err) => {
        clearTimeout(timeout);
        this.busy = false;
        resolve(
          `⚠️ An error occurred downloading the stream. Please try again.`
        );
      });
    });
  }

  static onEnd(msg) {
    return msg.author
      .createDM()
      .then((dmChannel) =>
        dmChannel
          .send(new Discord.MessageAttachment(this.filePath, this.fileName))
          .then(() => `✅ You acquired a rare item: 📁 \`FILE\` 📂 !`)
      )
      .catch((err) => {
        console.log("onEnd Error: ", err);
        throw `⚠️ An issue occurred sending you the file. Make sure you have allowed bots to DM you. Otherwise, talk to Dorfnox :P`;
      });
  }
}

module.exports = YoutubeDownloader;
