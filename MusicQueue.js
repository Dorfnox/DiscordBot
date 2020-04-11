const WaffleResponse = require('./WaffleResponse');
const config = require('./configWaffleBot');
const { decrementMaxMap } = require('./WaffleUtil');

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

    canQueue({ info, msg }) {
        const wr = new WaffleResponse();

        // Queue has reached capacity
        if (this.length() - 1 === this.maxQueueLength) {
            return wr.setResponse(`Queue Full! Maximum # of songs is ${this.maxQueueLength}`).setErrorLocale('canQueue').setIsDirectReply(true);
        }

        if (!msg.author) {
            return wr.setResponse('Message requires a member').setErrorLocale('canQueue').setIsSendable(false);
        }

        const { id: userId } = msg.author;
        if (this.maxSongsPerUserMap.get(userId) === this.maxSongsPerUser) {
            return wr.setResponse(`*You've reached ${this.maxSongsPerUser} songs. Let others use this feature too!*`).setErrorLocale('canQueue').setIsDirectReply(true);
        }

        const { videoId } = info.player_response.videoDetails;
        if (this.maxDuplicatesMap.get(videoId) === this.maxDuplicates) {
            return wr.setResponse(`*Can only queue the same song a max of ${this.maxDuplicates} times.*`).setErrorLocale('canQueue').setIsDirectReply(true);
        }

        return wr;
    }

    getMaxQueueLength() {
        return this.maxQueueLength;
    }

    getQueue() {
        return this.songQueue;
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
        decrementMaxMap(this.maxSongsPerUserMap, queueItem.msg.author.id);

        // Decrement the maxDuplicates
        decrementMaxMap(this.maxDuplicatesMap, queueItem.info.player_response.videoDetails.videoId);
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
        const wr = this.canQueue(queueItem);
        if (wr.isError) {
            return wr;
        }
        const { info, msg } = queueItem;

        const { id: userId } = msg.author;
        const currentMaxSongs = this.maxSongsPerUserMap.get(userId) || 0;
        this.maxSongsPerUserMap.set(userId, currentMaxSongs + 1);

        const { videoId } = info.player_response.videoDetails;
        const currentDuplicates = this.maxDuplicatesMap.get(videoId) || 0;
        this.maxDuplicatesMap.set(videoId, currentDuplicates + 1);

        this.songQueue.push(queueItem);
        return wr;
    }
}

module.exports = MusicQueue;