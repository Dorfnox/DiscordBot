const { decrementMaxMap } = require("../util/WaffleUtil");
const config = require("../../configWaffleBot");

class QueueContract {
  constructor(voiceChannel, connection) {
    this.voiceChannel = voiceChannel;
    this.connection = connection;
    this.musicQueue = new MusicQueue();
    this.isPaused = false;
    this.selfDestructTimeout = null;
    this.nowPlayingMsg = { id: '' };
    this.userEndedCurrentSong = false;
    this.isLooping = false;
    this.loopCount = 0;
  }

  endCurrentSong() {
    if (this.connection.dispatcher) {
      this.userEndedCurrentSong = true;
      this.connection.dispatcher.end();
    }
  }

  setNowPlayingMsg(nowPlayingMsg) {
    this.nowPlayingMsg = nowPlayingMsg;
  }

  toggleLoop(value = null) {
    this.isLooping = value !== null ? value : !this.isLooping;
  }
}

class QueueItem {
  constructor(info, guildMember, textChannel) {
    this.info = info;
    this.videoTitle = info.player_response.videoDetails.title;
    this.videoId = info.player_response.videoDetails.videoId;

    this.guildMember = guildMember;
    this.guildMemberDisplayName = guildMember.displayName;
    this.guildMemberId = guildMember.id;

    this.textChannel = textChannel;
  }
}

class MusicQueue {
  constructor() {
    const { music } = config;
    this.songQueue = [];
    this.maxQueueLength = music.maxQueueLength;
    this.maxSongLength = music.maxSongLength;
    this.maxDuplicates = music.maxDuplicates;
    this.maxDuplicatesMap = new Map();
    this.maxSongsPerUser = music.maxSongsPerUser;
    this.maxSongsPerUserMap = new Map();
  }

  updateSettings(options = {}) {
    Object.assign(this, options);
    return this;
  }

  canQueue(queueItem) {
    if (!queueItem instanceof QueueItem) {
      return Promise.reject(`That's not a QueueItem!`);
    }

    // Queue has reached capacity
    if (this.length() - 1 === this.maxQueueLength) {
      return Promise.reject(
        `Queue Full! Maximum # of songs is ${this.maxQueueLength}`
      );
    }

    const { guildMemberId, videoId } = queueItem;

    if (this.maxSongsPerUserMap.get(guildMemberId) === this.maxSongsPerUser) {
      return Promise.reject(
        `*You've reached ${this.maxSongsPerUser} songs. Let others use this feature too!*`
      );
    }

    if (this.maxDuplicatesMap.get(videoId) === this.maxDuplicates) {
      return Promise.reject(
        `*Can only queue the same song a max of ${this.maxDuplicates} times.*`
      );
    }

    return Promise.resolve();
  }

  getMaxQueueLength() {
    return this.maxQueueLength;
  }

  getQueue() {
    return this.songQueue;
  }

  getQueueItem(idx) {
    return idx > this.songQueue.length - 1 ? null : this.songQueue[idx];
  }

  dequeue() {
    return this.dequeueAt(0);
  }

  dequeueAt(idx) {
    if (this.isEmpty()) {
      return null;
    }
    // Normalize idx
    idx = Math.max(0, Math.min(this.songQueue.length - 1, idx));

    // Splice out song
    const queueItem = this.songQueue.splice(idx, 1)[0];

    // Decrement the maxSongsPerUser
    decrementMaxMap(this.maxSongsPerUserMap, queueItem.guildMemberId);

    // Decrement the maxDuplicates
    decrementMaxMap(this.maxDuplicatesMap, queueItem.videoId);
    return queueItem;
  }

  isEmpty() {
    return this.songQueue.length === 0;
  }

  length() {
    return this.songQueue.length;
  }

  peek() {
    return !this.isEmpty() ? this.songQueue[0] : null;
  }

  queue(queueItem) {
    return this.canQueue(queueItem).then(() => {
      const { guildMemberId, videoId } = queueItem;
      const currentMaxSongs = this.maxSongsPerUserMap.get(guildMemberId) || 0;
      this.maxSongsPerUserMap.set(guildMemberId, currentMaxSongs + 1);

      const currentDuplicates = this.maxDuplicatesMap.get(videoId) || 0;
      this.maxDuplicatesMap.set(videoId, currentDuplicates + 1);

      this.songQueue.push(queueItem);
      return queueItem;
    });
  }
}

module.exports = {
  QueueContract,
  QueueItem,
  MusicQueue,
};
