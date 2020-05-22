const Discord = require("discord.js");
const MessageHandler = require("./src/message/MessageHandler");
const WaffleMongo = require("./src/data-layer/WaffleMongo");
const GuildSettingsManager = require("./src/data-managers/GuildSettingsManager");
const TwitchChannelManager = require("./src/data-managers/TwitchChannelManager");
const WaffleMusic = require("./src/music/WaffleMusic2");
const GatsScraper = require("./src/gats/GatsScraper");
const Pokemon = require("./src/pokemon/Pokemon");
const YoutubeDownloader = require("./src/music/YoutubeDownloader");
const GenericResponse = require("./src/message/GenericResponse");
const OwnerCommands = require("./src/owner/OwnerCommands");
const { init, publicIP } = require("./configWaffleBot");
const Express = require("express");

/* DISCORD Initialization */
const { token: discordToken } = init;
const discordClient = new Discord.Client();
const messageHandler = new MessageHandler(discordClient);
discordClient
  .on("ready", () => {
    console.log("✅ Bot has logged in.");
    WaffleMongo.connect().then((mongoClient) => {
      console.log(`✅ Mongo DB connected: ${mongoClient.s.options.srvHost}`);
      GuildSettingsManager.init(discordClient);
      TwitchChannelManager.init(discordClient);
    });
    Pokemon.init(discordClient);
    WaffleMusic.init(discordClient);
    GatsScraper.init(discordClient);
    OwnerCommands.init(discordClient);
    GenericResponse.init(discordClient);
    YoutubeDownloader.init(discordClient);
    discordClient.user.setPresence({ activity: { name: "", type: "" } });
  })
  .on("message", (msg) => messageHandler.handleMessage(msg))
  .on("error", (err) => console.log("DISCORDJS Error: ", err.message));
discordClient.login(discordToken);

/* EXPRESS Initialization | Handle incomming webhooks */
const { port } = publicIP;
const app = Express();
app.post("/twitch/notify_on_live/:twitch_user_id", (req, res) => {
  res.status(200).send();
  const { twitch_user_id } = req.params;
  TwitchChannelManager.notifyOnLiveWebhookConsumer(twitch_user_id);
});
app.listen(port);
