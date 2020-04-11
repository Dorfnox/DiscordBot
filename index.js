const Discord = require('discord.js');
const MessageHandler = require('./MessageHandler');
const wf = require('./WaffleMongo');
const { token } = require('./configWaffleBot.json').init;

// Discord: Create a connection client ~~~~~~~~~~~~~~

const discordClient = new Discord.Client();
const messageHandler = new MessageHandler(discordClient);
discordClient.on('ready', () => {
    console.log('Bot has logged in.');
    discordClient.user.setPresence({ activity: { name: '', type: ''}});
})
.on('message', msg => messageHandler.handleMessage(msg))
.on('error', err => console.log('DISCORDJS Error: ', err.message));

discordClient.login(token);