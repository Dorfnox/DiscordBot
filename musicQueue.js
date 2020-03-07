class MusicQueueItem {
    constructor(thing) {
        this.thing = thing;
    }
}

class MusicQueue {
    constructor() {
        this.songQueue = [];
        this.songCountMap = new Map();
        this.maxQueueLength = 12;
        this.maxDuplicates = 2;
        this.maxPerUser = 3;
        this.userSongCountMap = new Map();
    }

    canQueue(msg) {
        // Queue has reached capacity
        if (this.length() === this.maxQueueLength) {
            msg.reply(`Queue is full. Maximum # of songs is ${thiss.maxQueueLength}`);
            return false;
        }
        return true;
    }

    get() {
        return this.songQueue;
    }

    dequeue() {
        return this.isEmpty() ? null : this.songQueue.shift();
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

    queue(itm, msg) {
        if (msg && !this.canQueue(msg)) return false;
        this.songQueue.push(itm);
        return true;
    }
}

module.exports = MusicQueue;