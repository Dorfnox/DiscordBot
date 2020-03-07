const { channelId: musicChannelId } = require('./discordBotConfig.json').music;
const ytdl = require('ytdl-core');
const yts = require('yt-search');
const MusicQueue = require('./musicQueue');

function verifyRequest(msg) {
    // we ignore it
    if (!msg.guild) return false;
    try {
        if (msg.member.voice.channel.id == musicChannelId) {
            return true;
        } else {
            return false
        }
    } catch  {
        console.error('member is not a part of a voice channel');
        return false
    }
}

function isBotInMusicChannel(client) {
    return client.voice && client.voice.connections.first().channel.id == musicChannelId;
}

class GatsMusic {
    constructor() {
        this.musicQueue = new MusicQueue();
    }

    getSimpleQueue(msg) {
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

    async play(client, msg, args) {
        if (!verifyRequest(msg)) return msg.reply('You need to be in the music channel to do that!');
        if (!isBotInMusicChannel(client)) {
            await this.join(client, musicChannelId);
        }
        if (!this.musicState.connection) {
            return console.log('No connection detected');
        }

        const ytLink = args[0];

        // No argument
        if (!ytLink || !args.join('')) {
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

    stop(client, msg) {
        if (!verifyRequest(msg)) {
            return msg.reply('You need to be in the music channel to stop the music!');
        }
        const { connection } = this.musicState;
        if (!connection) {
            return msg.reply('Bot must be in a music channel to stop music');
        }
        const { dispatcher } = connection;
        if (dispatcher) {
            dispatcher.end();
        }
    }

    join(client, channelId) {
        console.log(`Bot is joining a voice channel: ${channelId}`);
        return client.channels.fetch(channelId)
            .then(channel => channel.join())
            .then(connection => {
                this.musicState.connection = connection;
                console.log(`connection to channel ${channelId} successful!`);
            })
            .catch(err => {
                console.error(`channel ${channelId} does not exist`, err);
            });
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
                if ( !res.videos || !res.videos[0] ) {
                    console.error('[_playViaString | video error result] ', res);
                    return Promise.reject(`Coulld not find any results for '${argString}'. Try editing your search.`);
                }
                return this._getInfoViaLink(res.videos[0].url);
            })
            .catch(err => {
                console.error('[_playViaString | err] ', err);
                return Promise.reject(`Failed to play '${argString}'. Please try the same command again.`);
            });
    }

    _playRecursively() {
        const { info, msg } = this.musicQueue.peek();
        const { title, videoId } = info.player_response.videoDetails;
        const ytLink = `https://www.youtube.com/watch?v=${videoId}`;

        const readableStream = ytdl(ytLink, { filter: 'audioonly', quality: 'highestaudio' });
        this.musicState.connection
            .play(readableStream)
            .on('start', () => this._sendNowPlayingText(msg, title))
            .on('finish', () => {
                console.log(`${Date.now()}: '${title}' has finished playing`);
                this.musicQueue.dequeue();
                if (!this.musicQueue.isEmpty()) {
                    this._playRecursively();
                }
            })
            .on('error', err => {
                console.error('[_playViaLink | promiseAll error] ', err);
                msg.reply(`'${title}' encountered an error... Please try again.`);
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
}

GatsMusic.prototype.musicState = {
    connection: null
}

module.exports = new GatsMusic();