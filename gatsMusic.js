const ytdl = require('ytdl-core');
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
        const ytLink = args[0];
        if (!['youtube', 'youtu.be'].some(substring => ytLink.includes(substring))) {
            return msg.reply('Please provide a youtube link');
        }
        const { connection } = this.musicState;
        const dispatcher = connection.play(ytdl(ytLink, {
            filter: 'audioonly',
            quality: 'lowestaudio',
        }))
            .on('end', () => {
                console.log('Music ended!');
            })
            .on('error', error => {
                console.error(error);
            });
        // console.log('DISPATCHER', dispatcher);
        dispatcher.setVolumeLogarithmic(0.7);
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
}

GatsMusic.prototype.musicState = {
    connection: null
}

module.exports = new GatsMusic();