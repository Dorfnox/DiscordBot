const ytdl = require("ytdl-core");
const yts = require("yt-search");
const WaffleResponse = require("../message/WaffleResponse");
const ArgumentHandler = require("../message/ArgumentHandler");
const { QueueItem, QueueContract } = require("./MusicQueue");
const {
  getNumberFromArguments,
  getSafe,
  isStaff,
  randomMusicEmoji,
  randomWaffleColor,
  retry,
  zeroWidthSpaceChar,
} = require("../util/WaffleUtil");
const { highWaterMarkBitShift } = require("../../configWaffleBot.json").music;

class WaffleMusic {
  static init(discordClient) {
    this.discordClient = discordClient;
    // Map of guildId -> QueueContract
    this.serverQueue = new Map();
    this.musicArgMap = new ArgumentHandler()
      .addCmdsForCategory("Music", "Join", (msg, args) => this.join(msg, args))
      .addCmdsForCategory("Music", "Loop", (msg, args) => this.loop(msg, args))
      .addCmdsForCategory("Music", "Leave", (msg) => this.leave(msg))
      .addCmdsForCategory("Music", "Play", (msg, args) => this.play(msg, args))
      .addCmdsForCategory("Music", "Queue", (msg) => this.queue(msg))
      .addCmdsForCategory("Music", "Skip", (msg, args) => this.skip(msg, args))
      .addCmdsForCategory("Music", "Repeat", (msg) => this.repeat(msg))
      .addCmdsForCategory("Music", "Song", (msg) => this.song(msg))
      .addCmdsForCategory("Music", "Oops", (msg) => this.oops(msg))
      .addCmdsForCategory("Music", "Pause", (msg) => this.pause(msg))
      .addCmdsForCategory("Music", "UnLoop", (msg) => this.unloop(msg))
      .addCmdsForCategory("Music", "Unpause", (msg) => this.unpause(msg));
    this.ready = true;
    console.log("✅ WaffleMusic is ready.");
  }

  static messageConsumer(msg, args) {
    if (!this.ready) {
      return;
    }
    const pRes = this.musicArgMap.parseArguments(args);
    if (!pRes.exists) {
      return;
    }
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

  static join(msg, args) {
    if (!args) {
      return Promise.resolve("Please provide a valid voice channel name");
    }

    const { guild, member } = msg;
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

    const qc = this._getQueueContract(guildId);
    if (qc) {
      if (qc.isPaused) {
        return Promise.resolve(
          "Please Unpause me to join another channel - :waffle: unpause"
        );
      } else if (qc.voiceChannel.id === voiceChannel.id) {
        return Promise.resolve(
          `I'm already in **${voiceChannel.name}**, silly!`
        );
      } else if (!isStaff(member) && qc.musicQueue.length()) {
        return Promise.resolve(
          `Please wait until all songs have finished to join a different channel. Only staff can change channels while music is playing.`
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

  static loop(msg, args) {
    const { guild, member, channel: textChannel } = msg;
    const uivc = this._verifyUserIsInVoiceChannel(member);
    if (uivc.err) {
      return Promise.resolve(uivc.message);
    }
    const { id: guildId } = guild;
    const qc = this._getQueueContract(guildId);
    if (!qc) {
      return Promise.resolve(":person_shrugging: There are no songs to loop");
    } else if (qc.isLooping) {
      return Promise.resolve(":repeat: Music is **already** looping");
    }
    // TODO: Change if we end up adding loop count
    const loopCount = getNumberFromArguments(args) || 0;
    qc.toggleLoop();
    return Promise.resolve(`:repeat: Music loop is **enabled**`);
  }

  static unloop(msg, args) {
    const { guild, member, channel: textChannel } = msg;
    const uivc = this._verifyUserIsInVoiceChannel(member);
    if (uivc.err) {
      return Promise.resolve(uivc.message);
    }
    const { id: guildId } = guild;
    const qc = this._getQueueContract(guildId);
    if (!qc) {
      return Promise.resolve(":person_shrugging: There are no songs to unloop");
    } else if (!qc.isLooping) {
      return Promise.resolve(":repeat: Music is **already** not looping");
    }
    qc.toggleLoop();
    return Promise.resolve(`:repeat: Music loop is **disabled**`);
  }

  static leave(msg) {
    const { guild } = msg;
    const { id: guildId } = guild;
    const qc = this._getQueueContract(guildId);
    if (!qc) {
      return Promise.resolve(
        ":person_shrugging: There's no voice channel to leave"
      );
    }
    if (!isStaff(msg.member)) {
      if (qc.musicQueue.length()) {
        return Promise.resolve(
          ":stopwatch: Please wait until all music has finished playing to leave"
        );
      }
    }
    return this._leave(guildId);
  }

  static _leave(guildId) {
    return new Promise((resolve) => {
      const qc = this._getQueueContract(guildId);
      if (qc.selfDestructTimeout) {
        clearTimeout(qc.selfDestructTimeout);
        qc.selfDestructTimeout = null;
      }
      qc.voiceChannel.leave();
      this._deleteQueueContract(guildId);
      resolve(
        `:wave: Successfully left voice channel **${qc.voiceChannel.name}**!`
      );
    }).catch((err) => {
      console.log("LEAVE err: ", err);
      throw `⚠️ An error occurred while leaving the voice channel.`;
    });
  }

  static play(msg, args) {
    const { guild, member, channel: textChannel } = msg;
    const uivc = this._verifyUserIsInVoiceChannel(member);
    if (uivc.err) {
      return Promise.resolve(uivc.message);
    }
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
        ":headphones: To play music, please provide a :link: **YouTube link** or :keyboard: **type a search query**"
      );
    }

    const playExecutor = () =>
      this._getYTInfo(args)
        .then((info) => {
          if (!info) {
            return Promise.resolve('⚠️ *unknown error occurred*');
          } else if (parseInt(info.player_response.videoDetails.lengthSeconds) > 600) {
            return Promise.resolve('Aint nobody got time fo dat. That song is too damn long!');
          }
          return this._play(guildId, member, textChannel, info);
        })
        .catch((err) => {
          // Catch any getYTInfo errors
          console.log("PLAY err:", err);
          return Promise.resolve("⚠️ *unknown error occurred*");
        });
    // Join a channel if no queue contract exists
    if (!qc) {
      return this._join(guildId, userVoiceChannel).then(() => playExecutor());
    } else {
      // Play music
      return playExecutor();
    }
  }

  static _play(guildId, guildMember, textChannel, info) {
    // Attempt to queue song
    const qc = this._getQueueContract(guildId);
    const { musicQueue } = qc;
    const queueItem = new QueueItem(info, guildMember, textChannel);
    return musicQueue
      .queue(queueItem)
      .then(() => {
        if (musicQueue.length() === 1) {
          // Initiate recursive play
          return this._playQueue(guildId);
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
  }

  static _playQueue(guildId) {
    const qc = this._getQueueContract(guildId);
    if (qc.selfDestructTimeout) {
      clearTimeout(qc.selfDestructTimeout);
      qc.selfDestructTimeout = null;
    }
    const { musicQueue, connection, nowPlayingMsg } = qc;
    const { info, videoId, videoTitle, textChannel } = musicQueue.peek();
    const ytLink = `https://www.youtube.com/watch?v=${videoId}`;

    const readableStream = ytdl.downloadFromInfo(info, {
      filter: "audioonly",
      quality: "highestaudio",
      highWaterMark: 1 << highWaterMarkBitShift,
    }); /* ~4mbs */

    readableStream.on("error", (err) => {
      console.log("READABLE_STREAM_ERR: ", err);
    });
    // End is usually called before streaming actually finishes
    // readableStream.on("end", (e) => {
    //   console.log("READABLE_STREAM_END: ", e);
    // });

    try {
      connection
        .play(readableStream, { highWaterMark: 1 })
        .on("start", () => {
          this.discordClient.user.setPresence({
            activity: {
              name: `${videoTitle} 🎧`,
              type: "PLAYING",
              url: ytLink,
            },
          });
          const embeddedMessage = {
            embed: this._buildEmbeddedQueueMessage(guildId, false),
          };
          // See if last message in channel is 'Now Playing', and edit that instead.
          const sendPromise = () =>
            textChannel
              .send(embeddedMessage)
              .then((sentMessage) => {
                qc.setNowPlayingMsg(sentMessage);
              })
              .catch((err) => console.log(err));
          const editPromise = () =>
            nowPlayingMsg.edit(embeddedMessage).catch((err) => {
              console.log("_playQueue | Edit now playing message error:", err);
              return sendPromise();
            });
          textChannel.lastMessageID === nowPlayingMsg.id
            ? editPromise()
            : sendPromise();
        })
        .on("finish", () => {
          this._playFinish(guildId);
        })
        .on("error", (err) => {
          console.log("DISPATCHER_ERROR: ", err);
          this._playFinish(guildId);
        })
        .on("close", (c) => {
          console.log("DISPATCHER_CLOSE: ", c);
          this._playFinish(c);
        });
    } catch (err) {
      console.log("CONNECTION_PLAY_ERROR: ", err);
    }
  }

  static _playFinish(guildId) {
    const qc = this._getQueueContract(guildId);
    if (!qc) {
      return;
    }
    const { musicQueue, isLooping, userEndedCurrentSong, voiceChannel } = qc;
    this.discordClient.user.setPresence({
      activity: { name: "", type: "" },
    });
    const queueItem = musicQueue.dequeue();
    const addIfLooping = () =>
      isLooping &&
      !userEndedCurrentSong &&
      voiceChannel.members.some((m) => !m.user.bot)
        ? musicQueue.queue(queueItem)
        : Promise.resolve();
    qc.userEndedCurrentSong = false;
    addIfLooping().then(() => {
      if (musicQueue.isEmpty()) {
        // Clean the voice connection after 2 minutes
        qc.selfDestructTimeout = setTimeout(
          () => this._leave(guildId).catch((err) => console.log(err)),
          120000
        );
      } else {
        this._playQueue(guildId);
      }
    });
  }

  static queue(msg) {
    const { id: guildId } = msg.guild;
    const qc = this._getQueueContract(guildId);
    if (!qc || qc.musicQueue.isEmpty()) {
      return Promise.resolve(
        ":person_shrugging: There are **0** songs in the queue"
      );
    }
    return Promise.resolve(this._buildEmbeddedQueueMessage(guildId));
  }

  static skip(msg, args) {
    const { guild, member } = msg;
    const uivc = this._verifyUserIsInVoiceChannel(member);
    if (uivc.err) {
      return Promise.resolve(uivc.message);
    }

    const { id: guildId } = guild;
    const qc = this._getQueueContract(guildId);
    if (!qc || qc.musicQueue.isEmpty()) {
      return Promise.resolve(":person_shrugging: There's nothing to skip.");
    }

    // Get provided position, if any
    const queuePosition = Math.max(parseInt(args, 10) || 0, 0);

    // Verify there is a song at given queue position
    if (queuePosition > qc.musicQueue.length() - 1) {
      return Promise.resolve(
        `⚠️ No songs in queue position **#${queuePosition}**`
      );
    }

    // Allow song removal if any of the following conditions are met:
    // 1) Admins and moderators have default full permission
    // 2) The song being removed is the requester's song
    // 3) The original requester is no longer in the voice channel
    const requesterId = qc.musicQueue.getQueue()[queuePosition].guildMemberId;
    if (
      isStaff(member) ||
      member.id === requesterId ||
      !qc.voiceChannel.members.has(requesterId)
    ) {
      return this._skip(guildId, queuePosition);
    }

    // Not allowed!
    return Promise.resolve(`🚫 You don't have permission to do that`);
  }

  static _skip(guildId, queuePosition) {
    // Remove from queue if queuePosition is specified
    const qc = this._getQueueContract(guildId);
    const { musicQueue } = qc;
    const queueItem = musicQueue.getQueueItem(queuePosition);
    const { videoTitle } = queueItem;
    if (queuePosition > 0) {
      musicQueue.dequeueAt(queuePosition);
      return Promise.resolve(`🗑 removed **${videoTitle}** from the queue.`);
    } else {
      try {
        qc.endCurrentSong();
        return Promise.resolve(
          `🗑 The current song **${videoTitle}** has been skipped.`
        );
      } catch (err) {
        console.log("END_CURRENT_SONG_ERROR: ", err);
      }
    }
    return Promise.resolve();
  }

  static repeat(msg) {
    const { guild, member, channel: textChannel } = msg;
    const { id: guildId } = guild;
    const uivc = this._verifyUserIsInVoiceChannel(member);
    if (uivc.err) {
      return Promise.resolve(uivc.message);
    }

    const qc = this._getQueueContract(guildId);
    if (!qc || qc.musicQueue.isEmpty()) {
      return Promise.resolve(":person_shrugging: There's nothing to repeat.");
    }

    const queueItem = qc.musicQueue.peek();
    return this._play(guildId, member, textChannel, queueItem.info);
  }

  static song(msg) {
    const { guild } = msg;
    const { id: guildId } = guild;
    const qc = this._getQueueContract(guildId);
    if (!qc || qc.musicQueue.isEmpty()) {
      return Promise.resolve(
        ":person_shrugging: There are no songs currently playing."
      );
    }
    return Promise.resolve(this._buildEmbeddedQueueMessage(guildId, false));
  }

  static oops(msg) {
    const { member, guild } = msg;
    const { id: guildMemberId } = member;
    const { id: guildId } = guild;
    const qc = this._getQueueContract(guildId);
    if (qc && qc.musicQueue.length()) {
      const queue = qc.musicQueue.getQueue();
      let queuePosition = -1;
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].guildMemberId === guildMemberId) {
          queuePosition = i;
          break;
        }
      }
      if (queuePosition !== -1) {
        return this._skip(guildId, queuePosition);
      }
    }
    return Promise.resolve(`😕 You have nothing to be oopsy about.`);
  }

  static pause(msg) {
    return Promise.resolve("Feature is coming soon :tm:");
  }

  static unpause(msg) {
    return Promise.resolve("Feature is coming soon :tm:");
  }

  /* ~~~~~~~~~~~~~~~~~~ QUEUE CONTRACT HANDLERS ~~~~~~~~~~~~~~~~~~~ */

  static _hasQueueContract(guildId) {
    return this.serverQueue.has(guildId);
  }

  static _getQueueContract(guildId) {
    return this.serverQueue.get(guildId);
  }

  static _createQueueContract(guildId, voiceChannel, connection) {
    const queueContract = new QueueContract(voiceChannel, connection);
    this.serverQueue.set(guildId, queueContract);
    // this._debugConnection(connection);
    return queueContract;
  }

  static _updateQueueContract(guildId, options = {}) {
    const qc = this._getQueueContract(guildId);
    if (options.connection) {
      // this._debugConnection(options.connection);
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
      throw `⚠️ Invalid url **${ytLink}** - Imma need some valid blueberries, bruh!`;
    }
    return ytdl.getInfo(ytLink).catch((err) => {
      throw err;
    });
  }

  static _getYTInfoViaString(argString) {
    const options = { query: argString, pageStart: 1, pageEnd: 1 };
    const searchFunc = () =>
      yts(options)
        .then((res) => getSafe(() => res.videos || [], []))
        .then((videos) => {
          if (!videos || !videos[0]) {
            throw "⚠️ no videos found";
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
    const description = `${emoji} Requested by **${memberName}**. There ${queueLenStr} in the queue.`;
    const embeddedMessage = {
      color: randomWaffleColor(),
      author: {
        name: header,
      },
      title: videoTitle,
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
    const { musicQueue, isPaused, isLooping } = this._getQueueContract(guildId);
    const { videoTitle, videoId, guildMemberDisplayName } = musicQueue.peek();
    const playState = isPaused
      ? "Paused"
      : `Now Playing ${isLooping ? "🔁" : ""}`;
    let fields = [];
    if (includeFields) {
      fields = musicQueue
        .getQueue()
        .slice(1)
        .map((r, i) => {
          return {
            name: `#${i + 1} ~ by ${r.guildMemberDisplayName}`,
            value: `[${r.videoTitle}](https://www.youtube.com/watch?v=${videoId})`,
            inline: false,
          };
        });
      if (fields.length) {
        fields.unshift({
          name: zeroWidthSpaceChar,
          value: "**Music Queue**",
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
