const discord = require('discord.js');
const MessageHandler = require('./messageHandler');
const config = require('./discordBotConfig.json');
const { token } = config.init;

const client = new discord.Client();
const messageHandler = new MessageHandler(client);

client.on('ready', () => {
    console.log('Bot has logged in.');
})

client.on('message', msg => messageHandler.handleMessage(msg));

client.login(token);