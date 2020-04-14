const Discord = require('discord.js');

const MessageHandler = require('./src/message/MessageHandler');
const wf = require('./src/data-layer/WaffleMongo');
const { token } = require('./configWaffleBot.json').init;


// Discord: Create a connection client ~~~~~~~~~~~~~~

const discordClient = new Discord.Client();
const messageHandler = new MessageHandler(discordClient);

discordClient.on('ready', () => {
    console.log('Bot has logged in.');
    discordClient.user.setPresence({ activity: { name: '', type: ''}});
});

discordClient.on('message', msg => messageHandler.handleMessage(msg));

discordClient.on('error', err => console.log('DISCORDJS Error: ', err.message));

discordClient.login(token);