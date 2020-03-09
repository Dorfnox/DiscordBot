const discord = require('discord.js');
const MessageHandler = require('./messageHandler');
const config = require('./discordBotConfig.json');
const { token, testToken } = config.init;

const client = new discord.Client();
const messageHandler = new MessageHandler(client);

client.on('ready', () => {
    console.log('Bot has logged in.');
    client.user.setPresence({ activity: { name: '', type: ''}});
})

client.on('message', msg => messageHandler.handleMessage(msg));

// Initiate either regular client or test client
client.login(token);
// client.login(testToken);