class MusicQueueItem {
    constructor(thing) {
        this.thing = thing;
    }
}

class MusicQueue {
    constructor() {
        this.songQueue = [];
        this.maxQueueLength = 12;
        this.maxDuplicates = 2;
        this.maxPerUser = 3;
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

    queue(itm) {
        if (this.length() === this.maxQueueLength) return false;
        this.songQueue.push(itm);
        return true;
    }
}

module.exports = {
    MusicQueue
}