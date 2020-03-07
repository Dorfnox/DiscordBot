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
            console.log("No connection detected");
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
        const { connection } = this.musicState;
        const dispatcher = connection
            .play(
                ytdl(ytLink, {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                })
                .on('info', info => {
                    this._sendNowPlayingText(msg, info.player_response.videoDetails.title);
                })
            )
            .on('end', () => {
                console.log('Music ended!');
            })
            .on('error', err => {
                console.error("youtube playing error: ", err);
            });
        dispatcher.setVolumeLogarithmic(0.6);
    }

    _playViaString(msg, args) {
        const options = {
            query: args.join(' '),
            pageStart: 1,
            pageEnd: 1
        }
        yts(options, (err, r) => {
            if ( err ) {
                console.log("youtube SEARCH error: ", err);
                return ;
            }
            const { videos } = r;
            this._playViaLink(msg, r.videos[0].url);
        });
    }

    _sendNowPlayingText(msg, title) {
        const emojis = [..."🎸🎹🎺🎻🎼🎷🥁🎧🎤"];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        const str = `${emoji} *now playing* ~ ~ **${title}**`;
        msg.channel.send(str);
        console.log(`${Date.now()}: ${str}`);
    }
}

GatsMusic.prototype.musicState = {
    connection: null
}

module.exports = new GatsMusic();