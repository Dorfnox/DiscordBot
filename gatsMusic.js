const { channelId: musicChannelId } = require('./discordBotConfig.json').music;
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const MusicQueue = require('./musicQueue');

class GatsMusic {
    constructor(client) {
        this.musicQueue = new MusicQueue();
        this.client = client;
    }

    forceStop() {
        const dispatcher = this._getDispatcher();
        if (dispatcher) {
            dispatcher.end();
        }
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

    pause(msg) {
        if (!this._verifyRequest(msg, 'pause')) return ;
        if (this.getSimpleQueue().length === 0) {
            return msg.channel.send('there are no songs to pause, silly.');
        }
        const dispatcher = this._getDispatcher();
        if (dispatcher && !dispatcher.paused) {
            dispatcher.pause();
            const { title } = this.musicQueue.peek().info.player_response.videoDetails;
            msg.channel.send(`*paused ${title}*`)

        } else msg.channel.send('Can\'t pause what\'s paused, genius');
    }

    play(msg, args) {
        if (!this._verifyRequest(msg, 'play')) return ;
        const ytLink = args[0];

        // No argument
        if (!ytLink || !args.join('')) {
            // check if there's a song to unpause
            const dispatcher = this._getDispatcher();
            if (dispatcher && dispatcher.paused) {
                return dispatcher.resume();
            }
            return msg.reply('Please provide a YouTube link, or text, to play music, dumbass');
        }

        // Youtube link provided
        let infoPromise;
        if (['youtube', 'youtu.be'].some(substring => ytLink.includes(substring))) {
            infoPromise = this._getInfoViaLink(ytLink);

        // String provided
        } else infoPromise = this._getInfoViaString(args);

        infoPromise
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
            .catch(err => {
                console.error('[play | infoPromise error] ', err);
                msg.reply(err);
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
            return msg.channel.send(`😕 You have nothing to be oopsy about.`);
        }
        return this.skip(msg, queuePosition);
    }

    skip(msg, queuePosition = 0) {
        if (!this._verifyRequest(msg, 'skip')) return;
        if (queuePosition > this.musicQueue.length() - 1) {
            return msg.reply(`🚫 No songs in queue position #${queuePosition}`);
        }
        if (!this._verifyPermission(msg, queuePosition)) {
            return msg.reply(`🚫 You don't have permission to do that.`);
        }
        // Remove from queue if queuePosition is specified
        if (queuePosition > 0) {
            const queueItem = this.musicQueue.dequeueAt(queuePosition)[0];
            const { title } = queueItem.info.player_response.videoDetails;
            return msg.channel.send(`🗑 removed '*${title}*' from queue`);

        // End current song
        } else {
            const dispatcher = this._getDispatcher();
            if (dispatcher) {
                dispatcher.end();
            }
        }
    }

    unpause(msg) {
        if (!this._verifyRequest(msg, 'unpause')) return;
        if (this.getSimpleQueue().length === 0) {
            msg.channel.send('there are no songs to unpause, silly.');
        } else {
            const dispatcher = this._getDispatcher();
            if (dispatcher && dispatcher.paused) {
                dispatcher.resume();
                const { title } = this.musicQueue.peek().info.player_response.videoDetails;
                msg.channel.send(`*unpaused ${title}*`)
            }
            else msg.channel.send('Can\'t unpause what\'s not paused, genius.');
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
        return !this.client.voice ? undefined : this.client.voice.connections.first();
    }

    _getDispatcher() {
        const voiceConnection = this._getVoiceConnection();
        return !voiceConnection ? undefined : voiceConnection.dispatcher;
    }

    _playRecursively() {
        const { info, msg } = this.musicQueue.peek();
        const { title, videoId } = info.player_response.videoDetails;
        const ytLink = `https://www.youtube.com/watch?v=${videoId}`;

        const readableStream = ytdl(ytLink, { filter: 'audioonly', quality: 'lowestaudio', highWaterMark: 1 << 22 });
        const connection = this._getVoiceConnection();
        if (!connection) return ;
        connection
            .play(readableStream, { highWaterMark: 1 })
            .on('start', () => this._sendNowPlayingText(msg, title))
            .on('finish', () => {
                console.log(`${Date.now()}: '${title}' has finished playing`);
                this.musicQueue.dequeue();
                if (!this.musicQueue.isEmpty()) {
                    this._playRecursively();
                } else {
                    const dispatcher = this._getDispatcher();
                    if (dispatcher) dispatcher.end();
                }
            })
            .on('error', err => {
                console.error('[_playRecursively | err] ', err);
                msg.channel.send(`'${title}' encountered an error while streaming. skipping.`);
                const dispatcher = this._getDispatcher();
                if (dispatcher) {
                    dispatcher.end();
                }
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
        const str = `${this._randomMusicEmoji()} **${title}** has been queued in place #${this.musicQueue.length()}`;
        console.log(`${Date.now()}: ${str}`);
        return msg.channel.send(str);
    }

    _verifyPermission(msg, songIndex) {
        const { member } = msg;

        // Admins and moderators have default full permission
        if (member.hasPermission('KICK_MEMBERS')) {
            return true;
        }

        const { id: requesterId } = this.musicQueue.getQueue()[songIndex].msg.member;

        // User is the requester of the song
        if (member.id == requesterId) {
            return true;
        }

        // Original requester is no longer in the voice channel
        if (!msg.member.voice.channel.members.has(requesterId)) {
            return true;
        }

        // No!
        return false;
    }

    _verifyRequest(msg, cmd) {
        // Client is not connected to a voice channel
        const voiceConnection = this._getVoiceConnection();
        if (!voiceConnection) {
            msg.reply(`${cmd} cancelled - Have the bot join a music channel first by typing ':waffle: **join** ***nameOfVoiceChannel***'`);
            return false;
        }
        const { id, name } = voiceConnection.channel;
        // Member is not in the bot's voice channel
        if (!msg.member.voice || !msg.member.voice.channel || msg.member.voice.channel.id != id) {
            msg.reply(`You need to be in the voice channel '${name}' to run ${cmd}!`);
            return false;
        }
        return true;
    }
}

module.exports = GatsMusic;