const Discord = require("discord.js");

const MessageHandler = require("./src/message/MessageHandler");
const WaffleMongo = require("./src/data-layer/WaffleMongo");
const GuildManager = require("./src/guild-controls/GuildManager");
const { token } = require("./configWaffleBot.json").init;

const discordClient = new Discord.Client();
const messageHandler = new MessageHandler(discordClient);

discordClient.on("ready", () => {
  console.log("Bot has logged in.");
  WaffleMongo.connect().then((mongoClient) => {
    console.log(`Mongo DB successfully connected: `, mongoClient.s.options.srvHost);
    GuildManager.init(discordClient);
  });
  discordClient.user.setPresence({ activity: { name: "", type: "" } });
});

discordClient.on("message", (msg) => messageHandler.handleMessage(msg));

discordClient.on("error", (err) =>
  console.log("DISCORDJS Error: ", err.message)
);

discordClient.login(token);
