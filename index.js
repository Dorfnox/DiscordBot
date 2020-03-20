const Discord = require('discord.js');
const MessageHandler = require('./messageHandler');
const config = require('./discordBotConfig.json');
const { token, testToken } = config.init;

const client = new Discord.Client();
const messageHandler = new MessageHandler(client);

client.on('ready', () => {
    console.log('Bot has logged in.');
    client.user.setPresence({ activity: { name: '', type: ''}});
});

client.on('message', msg => messageHandler.handleMessage(msg));

client.on('error', err => console.log('DISCORDJS Error: ', err.message));

// Initiate either regular client or test client
client.login(token);
// client.login(testToken);