const WaffleResponse = require('./WaffleResponse');

class MusicQueue {
    constructor() {
        this.songQueue = [];
        this.songCountMap = new Map();
        this.maxQueueLength = 12;
        this.maxDuplicates = 2;
        this.maxPerUser = 3;
        this.userSongCountMap = new Map();
    }

    canQueue({ info, msg }) {
        const wr = new WaffleResponse();

        // Queue has reached capacity
        if (this.length() === this.maxQueueLength) {
            wr.setResponse(`Queue is full. Maximum # of songs is ${this.maxQueueLength}`).setErrorLocale('canQueue');
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
        return this.isEmpty() ? null : this.songQueue.shift();
    }

    dequeueAt(idx) {
        // If idx is > length of queue - 1, then remove last item
        return this.isEmpty() ? null : this.songQueue.splice(Math.min(idx, this.songQueue.length - 1), 1)[0];
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
        this.songQueue.push(queueItem);
    }
}

module.exports = MusicQueue;