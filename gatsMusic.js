const { channelId: musicChannelId } = require('./discordBotConfig.json').music;
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const MusicQueue = require('./MusicQueue');
const WaffleResponse = require('./WaffleResponse');
const { randomMusicEmoji } = require('./WaffleUtil');

class GatsMusic {
    constructor(client) {
        this.musicQueue = new MusicQueue();
        this.client = client;
    }

    getSimpleQueue() {
        if (this.musicQueue.isEmpty()) {
            return [];
        }
        const queue = this.musicQueue.getQueue();
        return queue.map(item => {
            const { title, videoId } = item.info.player_response.videoDetails
            const { author }  = item.msg;
            return { title, videoId, author };
        })
    }

    isInVoiceChannel() {
        return this.client.voice && this.client.voice.connections.first();
    }

    pause(msg) {
        return new Promise(resolve => {
            let wr = this._verifyRequest(msg);
            if (wr.isError) return resolve(wr);

            wr = this._verifyQueueIsNotEmpty();
            if (wr.isError) return resolve(wr);

            return resolve(this._pause());
        }).catch(err => {
            return new WaffleResponse('⚠️ *unknown error occurred*').setErrorLocale('pause').setError(err).setIsSendable(false);
        });
    }

    play(msg, args, options = {}) {
        return new Promise(resolve => {
            options = Object.assign({
                skipUserValidation: false,
            }, options);

            let wr = this._verifyRequest(msg, options);
            if (wr.isError) return resolve(wr);

            const ytLink = args[0];
            // No argument provided
            if (!ytLink || !args.join('')) {
                // check if there's a song to unpause
                const dispatcher = this._getDispatcher();
                if (dispatcher && dispatcher.paused) {
                    dispatcher.resume();
                    const { title } = this.musicQueue.peek().info.player_response.videoDetails;
                    return resolve(wr.setResponse(`*unpaused ${title}*`));
                }
                return resolve(wr.setResponse('*To play music, please provide a YouTube link or text*').setIsError(true));
            }

             // Youtube link provided
             let infoPromise;
             if (['youtube', 'youtu.be'].some(substring => ytLink.includes(substring))) {
                 infoPromise = this._getInfoViaLink(ytLink);

             // String provided
             } else infoPromise = this._getInfoViaString(args);

             return infoPromise.then(wr => {
                if (wr.isError) return resolve(wr);

                const info = wr.response;
                const queueItem = { info, msg }

                // Validate queueability
                wr = this.musicQueue.canQueue(queueItem);
                if (wr.isError) return resolve(wr);

                // Queue song
                this.musicQueue.queue(queueItem);

                // Initiate recursive play
                if (this.musicQueue.length() === 1) {
                    this._playRecursively();
                    return resolve(wr.setResponse('Initiated Recursive Play').setIsSendable(false));
                // Else, Ping user that their song has been added to the queue
                } else {
                    const { title } = info.player_response.videoDetails;
                    const queueText = `${randomMusicEmoji()} **${title}** *has been queued in position* **#${this.musicQueue.length() - 1}**`;
                    return resolve(wr.setResponse(queueText));
                }
            });
        }).catch(err => {
            return new WaffleResponse('⚠️ *unknown error occurred*').setErrorLocale('play').setError(err).setIsSendable(false);
        });
    }

    removeLast(msg) {
        const wr = new WaffleResponse();
        return new Promise(resolve => {
            const { id } = msg.member;
            let queuePosition = -1;
            const queue = this.musicQueue.getQueue();
            for (let i = queue.length - 1 ; i >= 0 ; i-- ) {
                if (queue[i].msg.member.id == id) {
                    queuePosition = i;
                    break;
                }
            }
            // Nothing in queue from member
            if (queuePosition == -1) {
                return resolve(wr.setResponse(`😕 You have nothing to be oopsy about.`));
            }
            return resolve(this.skip(msg, queuePosition));
        })
        .catch(err => {
            return new WaffleResponse('⚠️ *unknown error - please try again').setErrorLocale('removeLast').setError(err).setIsSendable(false);
        });
    }

    skip(msg, queuePosition = 0) {
        return new Promise(resolve => {
            let wr = this._verifyRequest(msg);
            if (wr.isError) return resolve(wr);

            wr = this._verifyQueueIsNotEmpty();
            if (wr.isError) return resolve(wr);

            // Verify there is a song at given queue position
            if (queuePosition > this.musicQueue.length() - 1) {
                return resolve(wr.setResponse(`🚫 No songs in queue position **#${queuePosition}**`));
            }

            wr = this._verifyPermission(msg, queuePosition);
            if (wr.isError) return resolve(wr);

            // Remove from queue if queuePosition is specified
            if (queuePosition > 0) {
                const queueItem = this.musicQueue.dequeueAt(queuePosition);
                const { title } = queueItem.info.player_response.videoDetails;
                return resolve(wr.setResponse(`🗑 removed '*${title}*' from queue`));
            }

            // Otherwise, end current song
            return this._endDispatcher().then(wr => resolve(wr.setIsSendable(false)));
        })
        .catch(err => {
            return new WaffleResponse('⚠️ *unknown error - please try again').setErrorLocale('skip').setError(err).setIsSendable(false);
        });
    }

    unpause(msg) {
        return new Promise(resolve => {
            let wr = this._verifyRequest(msg);
            if (wr.isError) return resolve(wr);

            wr = this._verifyQueueIsNotEmpty();
            if (wr.isError) return resolve(wr);

            return resolve(this._unpause());
        })
        .catch(err => {
            return new WaffleResponse('⚠️ *unknown error - please try again').setErrorLocale('unpause').setError(err);
        });
    }

    async _endDispatcher() {
        const wr = new WaffleResponse();
        const dispatcher = this._getDispatcher();
        if (dispatcher) {
            if (dispatcher.paused) await dispatcher.resume();
            dispatcher.end();
        }
        return wr;
    }

    _getInfoViaLink(ytLink)  {
        const wr = new WaffleResponse();
        if (!ytdl.validateURL(ytLink)) {
            return wr.setResponse(`Invalid url '${ytLink}'. Imma need some valid blueberries, bruh!`).setIsError(true);
        }
        return ytdl.getBasicInfo(ytLink).then(response => wr.setResponse(response));
    }

    _getInfoViaString(args) {
        const argString = args.join(' ');
        const options = { query: argString, pageStart: 1, pageEnd: 1 };
        const wr = new WaffleResponse();
        return yts(options)
            .then(res => {
                const videos = res.videos || [];
                const filteredVideos = videos.filter(video => {
                    // Ignore Youtube Movies Hardcode
                    return video.author.id !== 'UClgRkhTL3_hImCAmdLfDE4g';
                });
                const video = filteredVideos[0];
                if (!video) {
                    return wr.setResponse(`Coulld not find any results for '${argString}'. Try editing your search.`).setIsError(true);
                }
                return this._getInfoViaLink(video.url);
            })
            .catch(err => {
                return wr.setResponse(`Failed to perfom find for '${argString}'. Please try again.`).setError(err);
            });
    }

    _getVoiceConnection() {
        return this.isInVoiceChannel() ? this.client.voice.connections.first() : undefined;
    }

    _getDispatcher() {
        const voiceConnection = this._getVoiceConnection();
        return !voiceConnection ? undefined : voiceConnection.dispatcher;
    }

    _pause() {
        const wr = new WaffleResponse();
        const dispatcher = this._getDispatcher();
        if (dispatcher && !dispatcher.paused) {
            dispatcher.pause();
            const { title } = this.musicQueue.peek().info.player_response.videoDetails;
            return wr.setResponse(`*paused ${title}*`);
        }
        return wr.setResponse('Can\'t pause what\'s paused, genius').setIsError(true);
    }

    _playRecursively() {
        const { info, msg } = this.musicQueue.peek();
        const { title, videoId } = info.player_response.videoDetails;
        const ytLink = `https://www.youtube.com/watch?v=${videoId}`;
        const wr = new WaffleResponse();

        const readableStream = ytdl(ytLink, { quality: 'highestaudio', highWaterMark: 1 << 21 }); /* ~2mbs */
        const connection = this._getVoiceConnection();
        if (!connection) return ;
        connection
            .play(readableStream, { highWaterMark: 1 })
            .on('start', () => {
                wr.setResponse(`${randomMusicEmoji()} *now playing* ~ ~ **${title}**`).reply(msg);
                this.client.user.setPresence({ activity: { name: `${title} 🎧`, type: 'PLAYING', url: ytLink }});
            })
            .on('finish', () => {
                wr.setResponse(`**${title}** has finished playing`).setIsSendable(false).reply(msg);
                this.client.user.setPresence({ activity: { name: '', type: '' }});
                this.musicQueue.dequeue();
                if (!this.musicQueue.isEmpty()) {
                    this._playRecursively();
                }
            })
            .on('error', err => {
                wr.setResponse(`'${title}' encountered an error while streaming. skipping.`).setError(err).reply(msg);
                this.musicQueue.dequeue();
                if (!this.musicQueue.isEmpty()) {
                    this._playRecursively();
                }
            });
    }

    _unpause() {
        const wr = new WaffleResponse();
        const dispatcher = this._getDispatcher();
        if (dispatcher && dispatcher.paused) {
            dispatcher.resume();
            const { title } = this.musicQueue.peek().info.player_response.videoDetails;
            return wr.setResponse(`*unpaused ${title}*`);
        }
        return wr.setResponse(`There's nothing to unpause, genius.`).setIsError(true);
    }

    _verifyPermission(msg, songIndex) {
        const { member } = msg;
        const wr = new WaffleResponse();

        // Admins and moderators have default full permission
        if (member.hasPermission('KICK_MEMBERS')) {
            return wr;
        }

        const { id: requesterId } = this.musicQueue.getQueue()[songIndex].msg.member;

        // User is the requester of the song
        if (member.id == requesterId) {
            return wr;
        }

        // Original requester is no longer in the voice channel
        if (!msg.member.voice.channel.members.has(requesterId)) {
            return wr;
        }

        // Not allowed!
        return wr.setResponse(`🚫 *You don't have permission to do that*`).setIsError(true);
    }

    _verifyQueueIsNotEmpty() {
        const wr = new WaffleResponse();
        if (this.musicQueue.isEmpty()) {
            return wr.setResponse(`*No songs are currently in the queue*`).setIsError(true);
        }
        return wr;
    }

    _verifyRequest(msg, options = {}) {
        // Overwrite default options
        const defaultOptions = {
            skipUserValidation: false,
        }
        options = Object.assign(defaultOptions, options);
        const wr = new WaffleResponse();

        // Client is not connected to a voice channel
        const voiceConnection = this._getVoiceConnection();
        if (!voiceConnection) {
            return wr.setResponse(`⚠️ Have waffle join a voice channel first: ':waffle: **join** ***myVoiceChannel***'`).setIsError(true);
        }
        const { id, name } = voiceConnection.channel;
        // Member is not in the bot's voice channel
        if (!options.skipUserValidation &&
            (!msg.member.voice || !msg.member.voice.channel || msg.member.voice.channel.id != id)) {
            return wr.setResponse(`⚠️ You must be in the voice channel '${name}' to do that!`).setIsError(true);
        }
        return wr;
    }
}

module.exports = GatsMusic;