const axios = require("axios").default;
const ArgumentHandler = require("../message/ArgumentHandler");
const { sendChannel } = require("../util/WaffleUtil");

class Pokemon {
  static init(discordClient) {
    this.discordClient = discordClient;
    this.channelSet = new Set();
    this.pokeArgs = new ArgumentHandler()
      .addCmdsForCategory("Pokemon", "P!Hint", (msg) =>
        this.processNextPokeBotMessage(msg)
      )
      .addCmdsForCategory("Pokemon", "WhoDatPokemon", (msg) =>
        this.whoDatPokemon(msg)
      );
    this._requestPokemon()
      .then((allPokemon) => {
        this.allPokemon = allPokemon;
        this.ready = true;
        console.log("✅ Pokechord is ready.");
      })
      .catch((err) => {
        console.log("🚫 Pokemon is not ready:", err);
      });
  }

  static messageConsumer(msg, args) {
    // Initialize context
    const { guild, channel, content } = msg;
    const { name: guildName } = guild;
    const { username } = msg.author;
    const ctx = { guildName, username, content, err: null };

    // Exit if not initialized
    if (!this.ready) {
      ctx.err = `Feature is down at the moment`;
      return sendChannel(channel, { description: ctx.err }, ctx);
    }

    // Parse out arguments
    const parseRes = this.pokeArgs.parseArguments(args);
    if (!parseRes.exists) {
      return;
    }

    // Execute high-level argument function
    parseRes.value(msg);
    // .then((embed) => {
    //   sendChannel(channel, embed, ctx);
    // })
    // .catch((err) => {
    //   ctx.err = err;
    //   sendChannel(channel, { description: ctx.err }, ctx);
    // });
  }

  static processNextPokeBotMessage(msg) {
    const { guild, channel, content } = msg;
    const { name: guildName } = guild;
    const { id: channelId } = channel;
    const { username } = msg.author;
    const ctx = { guildName, username, content, err: null };

    // Verify user isn't already waiting for the pokeBot
    if (this.channelSet.has(channelId)) {
      ctx.err = `WaffleBot is already waiting for the hint`;
      return sendChannel(channel, { description: ctx.err }, ctx);
    }
    // Add channel to 'Listening' state
    this.channelSet.add(channelId);
    sendChannel(
      channel,
      { description: "🔥 Listening to Pokéchord for 15 seconds 💧" },
      ctx
    );

    const pokeString = "The wild pokémon is ";
    const timeToCollect = 15000;
    const filter = (m) =>
      m.author &&
      m.author.bot &&
      m.author.id == "365975655608745985" &&
      m.content &&
      m.content.startsWith(pokeString);

    // Create message collector
    const collector = channel.createMessageCollector(filter, {
      time: timeToCollect,
    });

    // Process bot message on collection
    collector.on("collect", (m) => {
      const pokeArg = m.content.substring(pokeString.length).slice(0, -1);
      const description = this._findPokemon(pokeArg)
        .map((p) => `**${p}**`)
        .join("\n");
      const title = `🌿 💧 🔥 ${
        !description ? "No " : "Your "
      } potential pokes 🔥 💧 🌿`;
      sendChannel(channel, { title, description }, ctx);
      collector.stop();
    });

    // Clean up channel set on end / dispose
    collector.on("end", () => this.channelSet.delete(channelId));
    collector.on("dispose", () => this.channelSet.delete(channelId));
  }

  static whoDatPokemon(msg) {
    const { guild, channel, content, author, id: msgId } = msg;
    const { name: guildName } = guild;
    const { username } = author;
    const { messages } = channel;
    const ctx = { guildName, username, content, err: null }
    messages.fetch({ limit: 10, before: msgId }).then((msgs) => {
      // Initial msg validation
      if (!msgs || msgs.length < 10) {
        ctx.err = '⚠️ Have at least 10 messages in your channel before using this feature.';
        return sendChannel(channel, { description: ctx.err }, ctx);
      }

      // Filter out all pokechord messages
      const pokeFilter = (m) =>
        m.author &&
        m.author.bot &&
        m.author.id == "365975655608745985" &&
        m.embeds &&
        m.embeds[0].description.startsWith("Guess the pokémon");
      const pokeMessages = msgs.filter(pokeFilter);
      if (!pokeMessages.length) {
        ctx.err = 'The Pokéchord message must be at most 10 messages back';
        return sendChannel(channel, { description: ctx.err }, ctx);
      }

      // Get latest pokechord message image url
      const pokeMessage = pokeMessages[pokeMessages.length - 1];
      const { url } = pokeMessage.embeds[0].image;

      // Perform google reverse-image search
      
    })
    .catch(err => {
      console.log("whoDatPokemon Err:", err);
      ctx.err = '⚠️ I may not have permssion to retrieve messages in this channel. Check with staff.';
      return sendChannel(channel, { description: ctx.err }, ctx);
    });
  }

  static _findPokemon(incompletePokeString) {
    // Normalize incompletePokeString
    incompletePokeString = incompletePokeString
      .replace(/\\_/g, "_")
      .toLowerCase();

    // Filter out pokemon whose name-length does not match the argument
    let filteredPokes = this.allPokemon
      .filter((p) => p.name.length === incompletePokeString.length)
      .map((p) => p.name);

    // Filter out every other pokemon that doesn't match given characters
    incompletePokeString.split("").forEach((c, i) => {
      if (c !== "_" && filteredPokes.length) {
        filteredPokes = filteredPokes.filter((p) => p[i] === c);
      }
    });
    return filteredPokes;
  }

  static _requestPokemon() {
    return axios
      .get("https://pokeapi.co:443/api/v2/pokemon/?offset=0&limit=10000")
      .then((data) => data.data.results);
  }
}

module.exports = Pokemon;
