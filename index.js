const Discord = require("discord.js");
const MessageHandler = require("./src/message/MessageHandler");
const WaffleMongo = require("./src/data-layer/WaffleMongo");
const GuildSettingsManager = require("./src/data-managers/GuildSettingsManager");
const TwitchChannelManager = require("./src/data-managers/TwitchChannelManager");
const WaffleMusic = require("./src/music/WaffleMusic2");
const YoutubeDownloader = require("./src/music/YoutubeDownloader");
const { token } = require("./configWaffleBot.json").init;
const Express = require("express");

/* DISCORD Initialization */
const discordClient = new Discord.Client();
const messageHandler = new MessageHandler(discordClient);
discordClient
  .on("ready", () => {
    console.log("✅ Bot has logged in.");
    WaffleMongo.connect().then((mongoClient) => {
      console.log(`✅ Mongo DB connected: ${mongoClient.s.options.srvHost}`);
      GuildSettingsManager.init(discordClient);
      WaffleMusic.init(discordClient);
      TwitchChannelManager.init(discordClient);
      YoutubeDownloader.init(discordClient);
    });
    discordClient.user.setPresence({ activity: { name: "", type: "" } });
  })
  .on("message", (msg) => messageHandler.handleMessage(msg))
  .on("error", (err) => console.log("DISCORDJS Error: ", err.message));
discordClient.login(token);

/* EXPRESS Initialization | Handle incomming webhooks */
const app = Express();
app.post("/twitch/notify_on_live", (req, res) => {
  res.status(200).end();
  TwitchChannelManager.notifyOnLiveWebhookConsumer(req);
});
app.listen(6969);
