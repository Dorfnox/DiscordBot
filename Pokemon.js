const axios = require('axios').default;
const WaffleResponse = require('./WaffleResponse');

class Pokemon {
    constructor(client) {
        this.client = client;
        this.channelSet = new Set();
        this._requestPokemon()
            .then(wr => {
                this.allPokemon = wr.response;
            })
            .catch(err => {
                new WaffleResponse('Could not request pokemon').setError(err).setErrorLocale('Pokemon Constructor').reply();
            });
    }

    async processNextPokeBotMessage(msg) {
        const wr = new WaffleResponse();
        const { channel } = msg;
        const { id: channelId } = channel;

        // Verify user isn't already waiting for the pokeBot
        if (this.channelSet.has(channelId)) {
            return wr.setResponse(`*WaffleBot is already waiting for the hint*`).reply(msg);
        }
        // Add channel to 'Listening' state
        this.channelSet.add(channelId);

        const pokeString = 'The wild pokémon is ';
        const timeToCollect = 10000;
        const filter = m => m.author && m.author.bot && m.author.id == '365975655608745985' && m.content && m.content.startsWith(pokeString);

        // Create message collector
        const collector = channel.createMessageCollector(filter, { time: timeToCollect });

        // Process bot message on collection
        collector.on('collect', m => {
            const pokeArg = m.content.substring(pokeString.length).slice(0, -1);
            const potentialPokes = this._findPokemon(pokeArg)
                .map(p => `**${p}**`).join('\n');
            const title = `🌿 💧 🔥 ${!potentialPokes ? 'No ' : 'Your '} potential pokes 🔥 💧 🌿`;
            wr.setEmbeddedResponse({
                title,
                description: potentialPokes,
            }).reply(msg);
            collector.stop();
        });

        // Clean up channel set on end / dispose 
        collector.on('end', () => this.channelSet.delete(channelId));
        collector.on('dispose', () => this.channelSet.delete(channelId));
    }

    _findPokemon(incompletePokeString) {
        // Normalize incompletePokeString
        incompletePokeString = incompletePokeString.replace(/\\_/g, "_").toLowerCase();

        // Filter out pokemon whose name-length does not match the argument
        let filteredPokes = this.allPokemon
            .filter(p => p.name.length === incompletePokeString.length)
            .map(p => p.name);

        // Filter out every other pokemon that doesn't match given characters
        incompletePokeString.split('').forEach((c, i) => {
            if (c !== '_' && filteredPokes.length) {
                filteredPokes = filteredPokes.filter(p => p[i] === c);
            }
        });
        return filteredPokes;
    }

    async _requestPokemon() {
        const pokeData = await axios.get('https://pokeapi.co:443/api/v2/pokemon/?offset=0&limit=10000');
        return new WaffleResponse(pokeData.data.results);
    }

}

module.exports = Pokemon;