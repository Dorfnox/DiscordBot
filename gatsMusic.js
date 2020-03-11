const { channelId: musicChannelId } = require('./discordBotConfig.json').music;
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const MusicQueue = require('./musicQueue');

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
        return this._verifyRequest(msg)
                .then(() => this._verifyQueueIsNotEmpty())
                .then(() => this._pause())
                .catch(err => {
                    console.log(`[GatsMusic | pause] `, err);
                    return err;
                });
    }

    play(msg, args, givenOptions = {}) {
        const options = Object.assign({
            skipUserValidation: false,
        }, givenOptions);

        return this._verifyRequest(msg, options)
            .then(() => {
                const ytLink = args[0];
                // No argument provided
                if (!ytLink || !args.join('')) {
                    // check if there's a song to unpause
                    const dispatcher = this._getDispatcher();
                    if (dispatcher && dispatcher.paused) {
                        dispatcher.resume();
                        const title = this.musicQueue.peek().info.player_response.videoDetails;
                        return Promise.resolve(`*unpaused ${title}*`);
                    }
                    return Promise.reject('*To play music, please provide a YouTube link or text*');
                }

                 // Youtube link provided
                let infoPromise;
                if (['youtube', 'youtu.be'].some(substring => ytLink.includes(substring))) {
                    infoPromise = this._getInfoViaLink(ytLink);

                // String provided
                } else infoPromise = this._getInfoViaString(args);

                return infoPromise
                    .then(info => {
                        const queueItem = { info, msg }

                        // Validate queueability
                        if (this.musicQueue.canQueue(queueItem))  {

                            // Queue song
                            this.musicQueue.queue(queueItem);

                            // Initiate recursive play
                            if (this.musicQueue.length() === 1) {
                                this._playRecursively();

                            // Ping user that their song has been added to the queue
                            } else this._sendNowQueuedText(msg, info.player_response.videoDetails.title);

                        }
                    })
                    .catch(err => err);
            })
            .catch(err => {
                console.log(err);
                return err;
            });
    }

    removeLast(msg) {
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
            return Promise.reject(`😕 You have nothing to be oopsy about.`);
        }
        return this.skip(msg, queuePosition);
    }

    skip(msg, queuePosition = 0) {
        return this._verifyRequest(msg)
            .then(() => this._verifyQueueIsNotEmpty())
            .then(() => {
                // Verify there is a song at given queue position
                if (queuePosition > this.musicQueue.length() - 1) {
                    return Promise.reject(`🚫 No songs in queue position #${queuePosition}`);
                }
            })
            .then(() => this._verifyPermission(msg, queuePosition))
            .then(() => {
                // Remove from queue if queuePosition is specified
                if (queuePosition > 0) {
                    const queueItem = this.musicQueue.dequeueAt(queuePosition);
                    const { title } = queueItem.info.player_response.videoDetails;
                    return msg.channel.send(`🗑 removed '*${title}*' from queue`);

                // End current song
                } else return this._endDispatcher();
            })
            .catch(err => err);
    }

    unpause(msg) {
        return this._verifyRequest(msg)
            .then(() => this._verifyQueueIsNotEmpty())
            .then(() => this._unpause())
            .catch(err => {
                console.log(err);
                return err;
            });
    }

    async _endDispatcher() {
        try {
            const dispatcher = this._getDispatcher();
            if (dispatcher) {
                if (dispatcher.paused) await dispatcher.resume();
                dispatcher.end();
            }
            return Promise.resolve(`Song has been skipped`);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    _getInfoViaLink(ytLink)  {
        if (!ytdl.validateURL(ytLink)) {
            return Promise.reject(`Invalid url '${ytLink}'. Please provide me valid blueberries, bruh!`);
        }
        return ytdl.getBasicInfo(ytLink);
    }

    _getInfoViaString(args) {
        const argString = args.join(' ');
        const options = { query: argString, pageStart: 1, pageEnd: 1 };
        return yts(options)
            .then(res => {
                const videos = res.videos || [];
                const filteredVideos = videos.filter(video => {
                    // Ignore Youtube Movies
                    return video.author.id !== 'UClgRkhTL3_hImCAmdLfDE4g';
                });
                const video = filteredVideos[0];
                if (!video) {
                    console.error('[_playViaString | video error result] ', res);
                    return Promise.reject(`Coulld not find any results for '${argString}'. Try editing your search.`);
                }
                return this._getInfoViaLink(video.url);
            })
            .catch(err => {
                console.error('[_playViaString | err] ', err);
                return Promise.reject(`Failed to perfom find for '${argString}'. Please try again.`);
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
        const dispatcher = this._getDispatcher();
        return new Promise((resolve, reject) => {
            console.log('hereeee');
            if (dispatcher && !dispatcher.paused) {
                console.log('hereeee');
                dispatcher.pause();
                const { title } = this.musicQueue.peek().info.player_response.videoDetails;
                return resolve({ text: `*paused ${title}*` });
    
            } else {
                reject({ text: 'Can\'t pause what\'s paused, genius' });
            }
        });
    }

    _playRecursively() {
        const { info, msg } = this.musicQueue.peek();
        const { title, videoId } = info.player_response.videoDetails;
        const ytLink = `https://www.youtube.com/watch?v=${videoId}`;

        const readableStream = ytdl(ytLink, { quality: 'highestaudio', highWaterMark: 1 << 21 }); /* ~2mbs */
        const connection = this._getVoiceConnection();
        if (!connection) return ;
        connection
            .play(readableStream, { highWaterMark: 1 })
            .on('start', () => {
                this.client.user.setPresence({ activity: { name: `${title} 🎧`, type: 'PLAYING', url: ytLink }});
                this._sendNowPlayingText(msg, title);
            })
            .on('finish', () => {
                console.log(`${Date.now()}: '${title}' has finished playing`);
                this.client.user.setPresence({ activity: { name: '', type: '' }});
                this.musicQueue.dequeue();
                if (!this.musicQueue.isEmpty()) {
                    this._playRecursively();
                }
            })
            .on('error', err => {
                console.error('[_playRecursively | err] ', err);
                msg.channel.send(`'${title}' encountered an error while streaming. skipping.`);
                this.musicQueue.dequeue();
                if (!this.musicQueue.isEmpty()) {
                    this._playRecursively();
                }
            });
    }

    _randomMusicEmoji() {
        const emojis = [...'🎸🎹🎺🎻🎼🎷🥁🎧🎤'];
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    _sendNowPlayingText(msg, title) {
        const str = `${this._randomMusicEmoji()} *now playing* ~ ~ **${title}**`;
        console.log(`${Date.now()}: ${str}`);
        return msg.channel.send(str);
    }

    _sendNowQueuedText(msg, title) {
        const str = `${this._randomMusicEmoji()} **${title}** *has been queued in position* **#${this.musicQueue.length() - 1}**`;
        console.log(`${Date.now()}: ${str}`);
        return msg.channel.send(str);
    }

    _unpause() {
        const dispatcher = this._getDispatcher();
        if (dispatcher && dispatcher.paused) {
            dispatcher.resume();
            const { title } = this.musicQueue.peek().info.player_response.videoDetails;
            return Promise.resolve(`*unpaused ${title}*`);
        }
        return Promise.reject(`There's nothing to unpause, genius.`);
    }

    _verifyPermission(msg, songIndex) {
        const { member } = msg;
        const goodPermText = '*Good permissions*';
        const badPermText = `🚫 *You don't have permission to do that*`;

        // Admins and moderators have default full permission
        if (member.hasPermission('KICK_MEMBERS')) {
            return Promise.resolve(goodPermText);
        }

        const { id: requesterId } = this.musicQueue.getQueue()[songIndex].msg.member;

        // User is the requester of the song
        if (member.id == requesterId) {
            return Promise.resolve(goodPermText);
        }

        // Original requester is no longer in the voice channel
        if (!msg.member.voice.channel.members.has(requesterId)) {
            return Promise.resolve(goodPermText);
        }

        // No!
        return Promise.reject(badPermText);
    }

    _verifyQueueIsNotEmpty() {
        if (this.musicQueue.isEmpty()) {
            return Promise.reject({ text: `*No songs are currently in the queue*` });
        } else {
            return Promise.resolve({ text: `*Queue contains songs*`});
        }
    }

    _verifyRequest(msg, options = {}) {
        // Overwrite default options
        return new Promise((resolve, reject) => {
            const defaultOptions = {
                skipUserValidation: false,
            }
            options = Object.assign(defaultOptions, options);

            // Client is not connected to a voice channel
            const voiceConnection = this._getVoiceConnection();
            if (!voiceConnection) {
                return reject({ text: `⚠️ Have waffle join a voice channel first: ':waffle: **join** ***myVoiceChannel***'`});
            }
            const { id, name } = voiceConnection.channel;
            // Member is not in the bot's voice channel
            if (!options.skipUserValidation &&
                (!msg.member.voice || !msg.member.voice.channel || msg.member.voice.channel.id != id)) {
                return reject({ text: `You must be in the voice channel '${name}' to do that!` });
            }
            return resolve({ text: 'verification good' });
        });
    }
}

module.exports = GatsMusic;