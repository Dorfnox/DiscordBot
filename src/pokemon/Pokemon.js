const axios = require("axios").default;
const Nightmare = require("nightmare");
const ArgumentHandler = require("../message/ArgumentHandler");
const { occurrences, roundToTwo, sendChannel } = require("../util/WaffleUtil");

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
        console.log("✅ Pokemon is ready.");
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
      { description: "🔥 Listening to Pokécord for 15 seconds 💧" },
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
    const ctx = { guildName, username, content, err: null };

    // Fire off a warning that WaffleBot is thinking
    sendChannel(
      channel,
      { description: "🧠 WaffleBot is thinking... this might take a moment" },
      ctx
    );

    messages
      .fetch({ limit: 10, before: msgId })
      .then((msgs) => {
        // Initial msg validation
        if (!msgs || msgs.length < 10) {
          ctx.err =
            "⚠️ Have at least 10 messages in your channel before using this feature.";
          return sendChannel(channel, { description: ctx.err }, ctx);
        }

        // Filter out all Pokécord messages
        const pokeFilter = (m) =>
          m.author &&
          m.author.bot &&
          m.author.id == "365975655608745985" &&
          m.embeds &&
          m.embeds[0] &&
          m.embeds[0].description &&
          m.embeds[0].description.startsWith("Guess the pokémon");
        const pokeMessages = [...msgs.filter(pokeFilter).values()];

        // If no Pokécord messages are found
        if (!pokeMessages.length) {
          ctx.err =
            "⚠️ No Pokemon Found 🔎 Pokéchord messages must be at most **10** messages back";
          return sendChannel(channel, { description: ctx.err }, ctx);
        }

        // Get latest Pokécord message's image url
        const { url } = pokeMessages.reduce(
          (lastMsg, currMsg) =>
            lastMsg.createdTimestamp > currMsg.createdTimestamp
              ? lastMsg
              : currMsg,
          pokeMessages[0]
        ).embeds[0].image;

        // Perform google reverse-image search
        return this._reverseImageSearch(url).then((searchResults) => {
          console.log('SEARCH_RESULTS', searchResults);
          const title = "🌿 💧 🔥 Potential Pokes 🔥 💧 🌿";

          // First collect results that contain potential names in their links.
          const linksContainingPotentialName = [
            "https://bulbapedia.bulbagarden.net/wiki/",
            "https://pokemon.fandom.com/wiki/",
            "https://nintendo.fandom.com/wiki/",
            "https://pokemontowerdefensetwo.fandom.com/wiki/",
            "https://www.pokemon.com/us/pokedex/",
            "https://www.serebii.net/pokedex-sm/",
          ];
          const typesToIgnore = [
            "normal ",
            "fire ",
            "fighting ",
            "water ",
            "flying ",
            "grass ",
            "poison ",
            "electric ",
            "ground ",
            "psychic ",
            "rock ",
            "ice ",
            "bug ",
            "dragon ",
            "ghost ",
            "dark ",
            "steel ",
            "fairy ",
            "??? ",
            "generation "
          ];
          const nameContainsType = (name) =>
            typesToIgnore.some((tti) => name.startsWith(tti));
          const linkNameFilter = (sr) =>
            linksContainingPotentialName.some(
              (lcpn) =>
                sr.url.startsWith(lcpn) &&
                !nameContainsType(sr.name.toLowerCase())
            );
          const resultsContainingPotentialName = searchResults.filter(
            linkNameFilter
          );

          // If no results, instead exit early and provide links to potential results
          if (!resultsContainingPotentialName.length) {
            ctx.err = "Couldn't find concrete results";
            const description = `${ctx.err}. Try the following links:\n\n>>> `.concat(
              searchResults.map((sr) => `[${sr.name}](${sr.url})`).join("\n\n")
            );
            return sendChannel(channel, { title, description }, ctx);
          }

          // Add each name-result to a Map of PokeName -> Count of Occurrences
          const pokeNameMap = new Map();
          resultsContainingPotentialName.forEach((rcpn) => {
            rcpn.name = rcpn.name.split(/ (\| |- #|- pok|\(P)/)[0].toLowerCase();
            pokeNameMap.set(rcpn.name, (pokeNameMap.get(rcpn.name) || 0) + 1);
          });

          // For each of the regular results, check for occurrences of names in them
          const pokeNames = [...pokeNameMap.keys()];
          searchResults
            // Collect regular results
            .filter((sr) => !linkNameFilter(sr))
            // Check the url, text, and description for occurrences of any pokeName
            .forEach((regularResult) => {
              const url = regularResult.url.toLowerCase();
              const text = regularResult.name.toLowerCase();
              const description = regularResult.description.toLowerCase();
              pokeNames.forEach((pn) => {
                const occCount =
                  occurrences(url, pn, false) +
                  occurrences(text, pn, false) +
                  occurrences(description, pn, false);
                pokeNameMap.set(pn, pokeNameMap.get(pn) + occCount);
              });
            });

          // Build description
          const totalCount = [...pokeNameMap.values()].reduce(
            (a, b) => a + b,
            0
          );
          const existingNameSet = new Set();
          const description = resultsContainingPotentialName
            // Only use results with unique names in map
            .filter((res) =>
              existingNameSet.has(res.name)
                ? false
                : existingNameSet.add(res.name)
            )
            // Calculate % of occurrences
            .map((res) => {
              const percentage = roundToTwo(
                (pokeNameMap.get(res.name) / totalCount) * 100
              );
              const { name, url } = res;
              return { percentage, name, url };
            })
            // Sort by highest % occurrence
            .sort((a, b) => b.percentage - a.percentage)
            .map(
              (res) =>
                `\n\`${res.percentage}% Certainty\` **[${res.name}](${res.url})**`
            )
            .join("\n");
          return sendChannel(channel, { title, description }, ctx);
        });
      })
      .catch((err) => {
        console.log("whoDatPokemon Err:", err);
        ctx.err =
          "⚠️ I may not have permssion to retrieve messages in this channel. Check with staff.";
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

  static _reverseImageSearch(url) {
    url = encodeURIComponent(url);
    const searchUrl = (pageStart) =>
      `https://www.google.com/searchbyimage?image_url=${url}&start=${pageStart}`;
    const nightmareSearch = (searchUrl) =>
      Nightmare({ show: false, gotoTimeout: 15000, waitTimeout: 15000 })
        .goto(searchUrl)
        .wait("#rso > div > div > div.r > a > h3")
        .evaluate(() => {
          const searchResults = document.querySelectorAll(
            "#rso > div.g > div.rc"
          );
          return Array.from(searchResults).map((searchResult) => {
            const aElem = searchResult.children[0].children[0];
            const url = aElem.href;
            const name = aElem.children[1].textContent;
            const description = searchResult.children[1].textContent;
            return { url, name, description };
          });
        })
        .end();

    return Promise.all([
      nightmareSearch(searchUrl(0)),
      nightmareSearch(searchUrl(10)),
    ])
      .then(([resOne, resTwo]) => [...resOne, ...resTwo])
      .catch((err) => {
        console.log("_reverseImageSearch Err:", err);
        throw "⚠️ An error occurred performing search for poke.";
      });
  }
}

module.exports = Pokemon;
