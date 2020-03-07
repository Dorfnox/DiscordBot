const ytdl = require('ytdl-core');
const yts = require('yt-search');
const { channelId: musicChannelId } = require('./discordBotConfig.json').music;

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
    constructor() {}

    async play(client, msg, args) {
        if (!verifyRequest(msg)) return msg.reply('You need to be in the music channel to do that!');
        if (!isBotInMusicChannel(client)) {
            await this.join(client, musicChannelId);
        }
        if (!this.musicState.connection) {
            console.log('No connection detected');
            return ;
        }

        const ytLink = args[0];

        // No argument
        if (!ytLink || !args.join('')) {
            msg.reply('Please provide a YouTube link or Text to play music, dumbass');

        // Youtube link provided
        } else if (['youtube', 'youtu.be'].some(substring => ytLink.includes(substring))) {
            return this._playViaLink(msg, ytLink);

        // String provided
        } else {
            return this._playViaString(msg, args);
        }
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

    _playViaLink(msg, ytLink)  {
        if (!ytdl.validateURL(ytLink)) {
            return msg.reply('Please provide a valid url, bruh.');
        }

        const promiseInfo = ytdl.getBasicInfo(ytLink);
        const promiseDispatcher = new Promise((resolve, reject) => {
            this.musicState.connection
                .play(
                    ytdl(ytLink, {
                        filter: 'audioonly',
                        quality: 'highestaudio',
                    })
                )
                .on('start', () => resolve())
                .on('finish', () => console.log(`song has ended.`))
                .on('error', err => reject(err));
        });

        Promise.all([promiseInfo, promiseDispatcher])
            .then(([ info ]) => {
                this._sendNowPlayingText(msg, info.player_response.videoDetails.title);
            })
            .catch(err => {
                console.error('[_playViaLink | promiseAll error] ', err);
                msg.reply('An error occurred. Pleaes try again.');
            });
    }

    _playViaString(msg, args) {
        const argString = args.join(' ');
        const options = { query: argString, pageStart: 1, pageEnd: 1 };
        yts(options)
            .then(res => {
                if ( !res.videos || !res.videos[0] ) {
                    console.error('[_playViaString | video error result] ', res);
                    return msg.reply(`Coulld not find any results for '${argString}'. Try editing your search.`);
                }
                return this._playViaLink(msg, res.videos[0].url);
            })
            .catch(err => {
                console.error('[_playViaString | err] ', err);
                return msg.reply(`Failed to play '${argString}'. Please try the same command again.`)
            });
    }

    _sendNowPlayingText(msg, title) {
        const emojis = [...'🎸🎹🎺🎻🎼🎷🥁🎧🎤'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const str = `${emoji} *now playing* ~ ~ **${title}**`;
        console.log(`${Date.now()}: ${str}`);
        return msg.channel.send(str);
    }
}

GatsMusic.prototype.musicState = {
    connection: null
}

module.exports = new GatsMusic();