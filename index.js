const discord = require('discord.js');
const GatsMusic = require('./gatsMusic');
const MessageHandler = require('./messageHandler');
const config = require('./discordBotConfig.json');
const { token } = config.init;
const { channelId: musicChannelId } = config.music;

const client = new discord.Client();
const messageHandler = new MessageHandler(client);

client.on('ready', () => {
    console.log('Bot has logged in.');
    // client.channels.fetch('684985787221016599')
    //     .then(ch => ch.send('wfl play thingy'));
    GatsMusic.join(client, musicChannelId);
})

client.on('message', msg => {
    // Ignore all bots
    if (!msg.author.bot) {
        messageHandler.handleMessage(msg);
    }
});

client.login(token);