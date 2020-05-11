const ytdl = require('ytdl-core');
const yts = require('yt-search');

const { MusicQueue } = require('./MusicQueue');
const WaffleResponse = require('../message/WaffleResponse');
const { getSafe, randomMusicEmoji, retry, zeroWidthSpaceChar } = require('../util/WaffleUtil');
const { highWaterMarkBitShift } = require('../../configWaffleBot.json').music;

class WaffleMusic {
    constructor(client) {
        this.musicQueue = new MusicQueue();
        this.client = client;
    }

    pause(msg) {
        return new Promise(resolve => {
            return resolve(new WaffleResponse().setResponse("Apologies, this command has been taken temporarily offline due to :waffle: **Dorfnox** :waffle: being too lazy to fix it."));
            let wr = this._verifyInVoiceChannel(msg);
            if (wr.isError) return resolve(wr);

            wr = this._verifyQueueIsNotEmpty();
            if (wr.isError) return resolve(wr);

            return resolve(this._pause());
        }).catch(err => {
            return new WaffleResponse('⚠️ *unknown error occurred*').setErrorLocale('pause').setError(err).setIsSendable(false);
        });
    }

    unpause(msg) {
        return new Promise(resolve => {
            return resolve(new WaffleResponse().setResponse("Apologies, this command has been taken temporarily offline due to :waffle: **Dorfnox** :waffle: being too lazy to fix it."));
            let wr = this._verifyInVoiceChannel(msg);
            if (wr.isError) return resolve(wr);

            wr = this._verifyQueueIsNotEmpty();
            if (wr.isError) return resolve(wr);

            return resolve(this._unpause());
        })
        .catch(err => {
            return new WaffleResponse('⚠️ *unknown error - please try again').setErrorLocale('unpause').setError(err);
        });
    }

    _pause() {
        const wr = new WaffleResponse();
        const dispatcher = this._getDispatcher();
        if (dispatcher && !dispatcher.paused) {
            dispatcher.pause();
            const { title } = this.musicQueue.peek().info.player_response.videoDetails;
            return wr.setResponse(`*paused ${title}*`);
        }
        return wr.setResponse(`Can't pause what's already paused, genius`).setIsError(true);
    }

    _unpause() {
        const wr = new WaffleResponse();
        const dispatcher = this._getDispatcher();
        if (dispatcher && dispatcher.paused) {
            dispatcher.resume();
            const { title } = this.musicQueue.peek().info.player_response.videoDetails;
            return wr.setResponse(`*unpaused ${title}*`);
        }
        return wr.setResponse(`*can't unpause what's not paused, genius.*`).setIsError(true);
    }
}

module.exports = WaffleMusic;