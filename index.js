const Discord = require('discord.js');
const MessageHandler = require('./MessageHandler');
const WaffleMongo = require('./WaffleMongo');
const { token, testToken } = require('./discordBotConfig.json').init;


// Discord: Create a connection client ~~~~~~~~~~~~~~

const discordClient = new Discord.Client();
const messageHandler = new MessageHandler(discordClient);
discordClient.on('ready', () => {
    console.log('Bot has logged in.');
    discordClient.user.setPresence({ activity: { name: '', type: ''}});
})
.on('message', msg => messageHandler.handleMessage(msg))
.on('error', err => console.log('DISCORDJS Error: ', err.message));

// client.login(token);
discordClient.login(testToken);