const discord = require('discord.js');
const { MessageHandler } = require('./messageHandler');

const bot = new discord.Client();

const token = 'Njg0OTg1MDIxMDE4Mjc1ODk0.XmCJrg.Sz_ML0LCfpdy-0etivkk06Yc8Ss';

bot.on('ready', () => {
    console.log('Bot has logged in.');
})

bot.on('message', MessageHandler.handleMessage);

bot.login(token);