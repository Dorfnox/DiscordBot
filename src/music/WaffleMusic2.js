const ytdl = require("ytdl-core");
const yts = require("yt-search");

const { MusicQueue, QueueItem } = require("./MusicQueue");
const WaffleResponse = require("../message/WaffleResponse");
const ArgumentHandler = require("../message/ArgumentHandler");
const {
  getSafe,
  randomMusicEmoji,
  randomWaffleColor,
  retry,
  zeroWidthSpaceChar,
} = require("../util/WaffleUtil");
const { highWaterMarkBitShift } = require("../../configWaffleBot.json").music;

class WaffleMusic {
  static discordClient = null;
  static serverQueue = new Map(); // Map of guildId -> MusicQueue
  static musicArgMap = new ArgumentHandler()
    .addCmds(["join", "j"], (msg, args) => this.join(msg, args))
    .addCmds(["leave", "l"], (msg) => this.leave(msg))
    .addCmds(["play", "p"], (msg, args) => this.play(msg, args));

  static init(discordClient) {
    this.discordClient = discordClient;
  }

  static executeMusicCmd(msg, args) {
    if (!this.discordClient) {
      return;
    }
    const pRes = this.musicArgMap.parseArguments(args);
    if (pRes.exists) {
      const musicArgs = ArgumentHandler.removeArgs(args, pRes.parseLength);
      pRes
        .value(msg, musicArgs)
        .then((res) => {
          if (res) {
            new WaffleResponse()
              .setEmbeddedResponse(
                typeof res === "string" ? { description: res } : res
              )
              .reply(msg);
          }
        })
        .catch((err) => {
          if (err) {
            new WaffleResponse()
              .setEmbeddedResponse({ description: err })
              .reply(msg);
          }
        });
    }
  }

  static join(msg, args) {
    if (!args) {
      return Promise.resolve("Please provide a valid voice channel name");
    }

    const { guild } = msg;
    const { id: guildId } = guild;

    // Find voice channel to join
    const channelToJoin = ArgumentHandler.argStrToArray(args)[0].toLowerCase();
    const channelFinder = (ch) =>
      ch.type === "voice" && ch.name.toLowerCase() === channelToJoin;
    const voiceChannel = guild.channels.cache.find(channelFinder);
    if (!voiceChannel) {
      return Promise.resolve(
        "Please provide the name of an existing voice channel"
      );
    }

    const qc = this._getQueueContract(guild.id);
    if (qc) {
      if (qc.isPaused) {
        return Promise.resolve(
          "Please Unpause me to join another channel - :waffle: unpause"
        );
      } else if (qc.voiceChannel.id === voiceChannel.id) {
        return Promise.resolve(
          `I'm already in **${voiceChannel.name}**, silly!`
        );
      } else if (qc.musicQueue.length()) {
        return Promise.resolve(
          `Please wait until all songs have finished to join a different channel`
        );
      }
    }
    return this._join(guildId, voiceChannel);
  }

  static _join(guildId, voiceChannel) {
    return voiceChannel
      .join()
      .then((connection) => {
        if (this._hasQueueContract(guildId)) {
          this._updateQueueContract(guildId, { connection, voiceChannel });
        } else {
          this._createQueueContract(guildId, voiceChannel, connection);
        }
        return `✅ Successfully connected to voice channel **${voiceChannel.name}**!`;
      })
      .catch((err) => {
        console.log("JOIN err: ", err);
        throw `⚠️ ~ Failed to connect to channel **${voiceChannel.name}**. Please try again. If the failure to connect persists, ensure the bot has **voice channel permissions**.`;
      });
  }

  static leave(msg) {
    const { guild } = msg;
    const qc = this._getQueueContract(guild.id);
    if (!qc) {
      return Promise.resolve(
        ":person_shrugging: There's no voice channel to leave"
      );
    }
    if (qc.musicQueue.length()) {
      return Promise.resolve(
        ":stopwatch: Please wait until all music has finished playing to leave"
      );
    }
    return this._leave(guild.id);
  }

  static _leave(guildId) {
    return new Promise((resolve) => {
      const qc = this._getQueueContract(guildId);
      qc.voiceChannel.leave();
      this._deleteQueueContract(guildId);
      resolve(
        `:wave: Successfully left voice channel **${qc.voiceChannel.name}**!`
      );
    }).catch((err) => {
      console.log("LEAVE err: ", err);
      throw `⚠️ ~ Failed to leave voice channel`;
    });
  }

  static play(msg, args) {
    const uivc = this._verifyUserIsInVoiceChannel(msg.member);
    if (uivc.err) {
      return Promise.resolve(uivc.message);
    }
    const { guild, member, channel: textChannel } = msg;
    const { channel: userVoiceChannel } = member.voice;
    const { id: guildId } = guild;
    const qc = this._getQueueContract(guildId);

    // No argument provided
    if (!args) {
      // check if there's a song to unpause
      if (qc && qc.isPaused) {
        // dispatcher.resume();
        // const { videoTitle } = this.musicQueue.peek().info.player_response.videoDetails;
        // return resolve(wr.setResponse(`*unpaused ${videoTitle}*`));
      }
      return Promise.resolve(
        "To play music, please provide a **YouTube link** or **type a search query**"
      );
    }

    // Join a channel if no queue contract exists
    if (!qc) {
      return this._join(guildId, userVoiceChannel).then(() =>
        this._play(guildId, member, textChannel, args)
      );
    }
    // Play music
    return this._play(guildId, member, textChannel, args);
  }

  static _play(guildId, guildMember, textChannel, searchText) {
    return this._getYTInfo(searchText)
      .then((info) => {
        // Attempt to queue song
        const qc = this._getQueueContract(guildId);
        const { musicQueue } = qc;
        const queueItem = new QueueItem(info, guildMember, textChannel);
        return musicQueue
          .queue(queueItem)
          .then(() => {
            if (musicQueue.length() === 1) {
              // Initiate recursive play
              this._playRecursively(guildId);
              return;
            }
            const { videoTitle, videoId, guildMemberDisplayName } = queueItem;
            const header = `Queued in position #${musicQueue.length() - 1}`;
            return this._buildEmbeddedVideoMessage(
              guildId,
              header,
              videoTitle,
              videoId,
              guildMemberDisplayName
            );
          })
          .catch((err) => {
            // Catch any queueing validation errors and return them.
            return err;
          });
      })
      .catch((err) => {
        console.log("PLAY err:", err);
        throw "⚠️ *unknown error occurred*";
      });
  }

  static _playRecursively(guildId) {
    const qc = this._getQueueContract(guildId);
    if (qc.selfDestructTimeout) {
      clearTimeout(qc.selfDestructTimeout);
      qc.selfDestructTimeout = null;
    }
    const { musicQueue, connection } = qc;
    const { info, videoId, videoTitle, textChannel } = musicQueue.peek();
    const ytLink = `https://www.youtube.com/watch?v=${videoId}`;

    const readableStream = ytdl.downloadFromInfo(info, {
      quality: "highestaudio",
      highWaterMark: 1 << highWaterMarkBitShift,
    }); /* ~4mbs */

    readableStream.on("error", (err) => {
      console.log("READABLE_STREAM_ERROR: ", err);
    });
    readableStream.on("debug", (d) => {
      console.log("READABLE_STREAM_DEBUG: ", d);
    });
    readableStream.on("close", (c) => {
      console.log("READABLE_STREAM_CLOSE: ", c);
    });

    connection
      .play(readableStream, { highWaterMark: 1 })
      .on("start", () => {
        this.discordClient.user.setPresence({
          activity: { name: `${videoTitle} 🎧`, type: "PLAYING", url: ytLink },
        });
        const embeddedMessage = this._buildEmbeddedQueueMessage(guildId, false);
        textChannel
          .send({ embed: embeddedMessage })
          .catch((err) => console.log(err));
      })
      .on("finish", () => {
        this._playOnFinish(guildId);
      })
      .on("error", (err) => {
        console.log("DISPATCHER_ERROR: ", err);
        this._playOnFinish(guildId);
      })
      .on("debug", (d) => {
        console.log("DISPATCHER_DEBUG: ", d);
      })
      .on("close", (c) => {
        console.log("DISPATCHER_CLOSE: ", c);
      });
  }

  static _playOnFinish(guildId) {
    const qc = this._getQueueContract(guildId);
    const { musicQueue } = qc;
    this.discordClient.user.setPresence({
      activity: { name: "", type: "" },
    });
    musicQueue.dequeue();
    if (musicQueue.isEmpty()) {
      // Clean the voice connection after 2 minutes
      qc.selfDestructTimeout = setTimeout(
        () => this._leave(guildId).catch((err) => console.log(err)),
        120000
      );
    } else {
      this._playRecursively(guildId);
    }
  }

  /* ~~~~~~~~~~~~~~~~~~ QUEUE CONTRACT HANDLERS ~~~~~~~~~~~~~~~~~~~ */

  static _hasQueueContract(guildId) {
    return this.serverQueue.has(guildId);
  }

  static _getQueueContract(guildId) {
    return this.serverQueue.get(guildId);
  }

  static _createQueueContract(guildId, voiceChannel, connection) {
    const queueContract = {
      voiceChannel,
      connection,
      musicQueue: new MusicQueue(),
      isPaused: false,
      selfDestructTimeout: null,
    };
    this.serverQueue.set(guildId, queueContract);
    this._debugConnection(connection);
    return queueContract;
  }

  static _updateQueueContract(guildId, options = {}) {
    const qc = this._getQueueContract(guildId);
    if (options.connection) {
      this._debugConnection(options.connection);
    }
    return Object.assign(qc, options);
  }

  static _deleteQueueContract(guildId) {
    return this.serverQueue.delete(guildId);
  }

  /* ~~~~~~~~~~~~~~~~~~ YOUTUBE LINK HANDLERS ~~~~~~~~~~~~~~~~~~~ */

  static _getYTInfo(args) {
    const ytLink = ArgumentHandler.argStrToArray(args)[0];
    // Youtube link provided
    if (
      ["youtube", "youtu.be"].some((substring) => ytLink.includes(substring))
    ) {
      return this._getYTInfoViaLink(ytLink);
    }
    // String provided
    return this._getYTInfoViaString(args);
  }

  static _getYTInfoViaLink(ytLink) {
    if (!ytdl.validateURL(ytLink)) {
      return Promise.resolve(
        `Invalid url '${ytLink}'. Imma need some valid blueberries, bruh!`
      );
    }
    return ytdl.getInfo(ytLink);
  }

  static _getYTInfoViaString(argString) {
    const options = { query: argString, pageStart: 1, pageEnd: 1 };
    const searchFunc = () =>
      yts(options)
        .then((res) => getSafe(() => res.videos || [], []))
        .then((videos) => {
          if (!videos || !videos[0]) {
            console.error(`__E: No videos found... retrying`);
            throw "no videos found";
          }
          return videos;
        });
    return retry(searchFunc, 3, 500)
      .then((videos) => {
        const filteredVideos = videos.filter((video) => {
          // Ignore Youtube Movies Hardcode
          return video.author.id !== "UClgRkhTL3_hImCAmdLfDE4g";
        });
        return this._getYTInfoViaLink(filteredVideos[0].url);
      })
      .catch((err) => {
        console.log("_getYTInfoViaString err:", err);
        throw `⚠️ Could not find any results for '${argString}'. Try again, or try a different search.`;
      });
  }

  /* ~~~~~~~~~~~~~~~~~ VERIFICATION HELPERS ~~~~~~~~~~~~~~~~~~~~~ */

  static _verifyUserIsInVoiceChannel(guildMember) {
    const qc = this._getQueueContract(guildMember.guild.id);
    const result = { error: false, message: "" };
    // Member should be in a voice channel
    if (!guildMember.voice.channel) {
      result.err = true;
      if (qc) {
        result.message = `⚠️ You must be in the voice channel **${qc.voiceChannel.name}** to do that!`;
      } else {
        result.message = `⚠️ You must be in a voice channel to do that!`;
      }
    } else if (qc && guildMember.voice.channel.id !== qc.voiceChannel.id) {
      // Member should be in the same voice channel as the bot
      result.err = true;
      result.message = `⚠️ You must be in the voice channel **${qc.voiceChannel.name}** to do that!`;
    }
    return result;
  }

  /* ~~~~~~~~~~~~~~~~~ OTHER HELPERS ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

  static _buildEmbeddedVideoMessage(
    guildId,
    header,
    videoTitle,
    videoId,
    memberName,
    fields = []
  ) {
    const emoji = randomMusicEmoji();
    const qc = this._getQueueContract(guildId);
    const queueLen = qc.musicQueue.length() - 1;
    const queueLenStr =
      queueLen === 1 ? `is **1** song` : `are **${queueLen}** more songs`;
    const description = `Requested by **${memberName}**. There ${queueLenStr} in the queue.`;
    const embeddedMessage = {
      color: randomWaffleColor(),
      author: {
        name: header,
      },
      title: `${videoTitle} ${emoji}`,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      description,
      thumbnail: {
        url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      },
      fields,
    };
    return embeddedMessage;
  }

  static _buildEmbeddedQueueMessage(guildId, includeFields = true) {
    const { musicQueue, isPaused } = this._getQueueContract(guildId);
    const { videoTitle, videoId, guildMemberDisplayName } = musicQueue.peek();
    const playState = isPaused ? "Paused" : "Now Playing";
    let fields = [];
    if (includeFields) {
      fields = musicQueue
        .getQueue()
        .slice(1)
        .map((r, i) => {
          return {
            name: `#${i + 1} ~ by ${r.guildMemberDisplayName}`,
            value: `${r.videoTitle}`,
            inline: false,
          };
        });
      if (fields.length) {
        fields.unshift({
          name: zeroWidthSpaceChar,
          value: "***Music Queue***",
        });
      }
    }
    return this._buildEmbeddedVideoMessage(
      guildId,
      playState,
      videoTitle,
      videoId,
      guildMemberDisplayName,
      fields
    );
  }

  /* ~~~~~~~~~~~~~~~~~ DEBUGGGGGGINNGGGGGG ~~~~~~~~~~~~~~~~~~~~~ */

  static _debugConnection(connection) {
    connection.on("error", (err) => {
      console.log(new Date().toUTCString(), "CONNECTION ERROR", err);
    });
    connection.on("debug", (d) => {
      if (
        getSafe(
          () =>
            !d.startsWith('[WS] >> {"op":3,"d"') &&
            !d.startsWith('[WS] << {"op":6,"d"'),
          true
        )
      ) {
        console.log("VOICE_CONNECTION_DEBUG: ", d);
      }
    });
  }
}

module.exports = WaffleMusic;
