const Discord = require('discord.js');
const MessageHandler = require('./messageHandler');
const MongoClient = require('mongodb').MongoClient;
const config = require('./discordBotConfig.json');
const { token, testToken } = config.init;
const { mongoDBUsername, mongoDBPassword } = config.mongoDB;

 
// MongoDB: connect to the server ~~~~~~~~~~~~~~~~~~~~

const mongDBUrl = `mongodb+srv://${mongoDBUsername}:${mongoDBPassword}@dorfnoxcluster-uwoxw.mongodb.net/test?retryWrites=true&w=majority`;
MongoClient.connect(mongDBUrl, { useUnifiedTopology: true }, (err, mongoClient) => {
  console.log("Connected successfully to MongoDB server");
  mongoClient.on('close', () => console.log('Disconnected from MongoDB server'));
});


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