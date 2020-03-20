const config = require('./discordBotConfig.json');
const GatsScraper = require('./GatsScraper');
const GatsMusic = require('./gatsMusic');
const Pokemon = require('./Pokemon');
const WaffleResponse = require('./WaffleResponse');
const { arrayFromObjectValues, randomFromArray } = require('./WaffleUtil');
const { prefixes } = config.chat;

class MessageHandler {
    constructor(client) {
        this.client = client;
        this.gatsMusic = new GatsMusic(client);
        this.gatsScraper = new GatsScraper();
        this.pokemon = new Pokemon();
        this.helpCategory = {
            gats: {
                name: 'Gats',
                description: 'Queries for gats information.'
            },
            general: {
                name: 'General',
                description: 'General commands.'
            },
            music: {
                name: 'Music',
                description: 'Control the music player.'
            },
            pokemon: {
                name: 'Pokemon',
                description: 'Interacts with Pokecord!'
            }
        }
        this.commands = {
            'feed': {
                name: 'Feed',
                execute: this.executeFeed,
                description: 'Give wfl waffles!',
                helpCategory: this.helpCategory.general,
            },
            'help': {
                name: 'Help',
                execute: this.executeHelp,
                description: 'Command waffle with waffle|wfl|w|:waffle: + *command*.',
                aliases: ['h'],
                helpCategory: this.helpCategory.general,
            },
            'how': {
                name: 'How',
                execute: this.executeHow,
                description: 'Try \'how old is kendron\' to find out Kendron\'s age!',
                helpCategory: this.helpCategory.general,
            },
            'join': {
                name: 'Join',
                execute: this.executeJoin,
                description: 'Provide the name of a VOICE CHANNEL to join.',
                aliases: ['j'],
                helpCategory: this.helpCategory.music,
            },
            'nani': {
                name: 'Nani',
                execute: this.executeNani,
                description: 'UwU notice me senpai.',
                helpCategory: this.helpCategory.general,
            },
            'pause': {
                name: 'Pause',
                execute: this.executePause,
                description: 'Pause the current song.',
                helpCategory: this.helpCategory.music,
            },
            'play': {
                name: 'Play',
                execute: this.executePlay,
                description: 'Play a song via description/youtube-link. Also unpauses.',
                aliases: ['p', 'pl'],
                helpCategory: this.helpCategory.music,
            },
            'p!hint': {
                name: 'p!hint',
                execute: this.executePokeHint,
                description: `Run 'w p!hint' before running 'p!hint' for a little ***more*** help.`,
                helpCategory: this.helpCategory.pokemon,
            },
            'queue': {
                name: 'Queue',
                execute: this.executeQueue,
                description: 'Displays the current songs in the queue.',
                aliases: ['q'],
                helpCategory: this.helpCategory.music,
            },
            'oops': {
                name: 'Oops',
                execute: this.executeOops,
                description: 'Removes the last song you accidentally entered into the queue.',
                helpCategory: this.helpCategory.music,
            },
            'repeat': {
                name: 'Repeat',
                execute: this.executeRepeat,
                description: 'Queues up the currently playing song to be played again.',
                aliases: ['r'],
                helpCategory: this.helpCategory.music,
            },
            'salt': {
                name: 'Salt',
                execute: this.executeSalt,
                description: 'Just why?',
                helpCategory: this.helpCategory.general,
            },
            'say': {
                name: 'Say',
                execute: this.executeSay,
                description: 'I will repeat what you say :D',
                helpCategory: this.helpCategory.general,
            },
            'skip': {
                name: 'Skip',
                execute: this.executeSkip,
                description: 'Stops the current song, or removes from queue (eg: *skip 3*).',
                aliases: ['stop'],
                helpCategory: this.helpCategory.music,
            },
            'song': {
                name: 'Song',
                execute: this.executeSong,
                description: 'Reveals the currently playing song',
                helpCategory: this.helpCategory.music,
            },
            'top5': {
                name: 'Top5',
                execute: this.executeTopFive,
                description: 'Get the top five players from the gats leaderboard.',
                helpCategory: this.helpCategory.gats,
            },
            'unpause': {
                name: 'Unpause',
                execute: this.executeUnpause,
                description: 'Unpause the current song.',
                helpCategory: this.helpCategory.music,
            }
        }
        // Map of Alias -> Command (eg: p -> play )
        this.aliasMap = new Map();
        Object.keys(this.commands).forEach(cmd => {
            if (this.commands[cmd].aliases) {
                this.commands[cmd].aliases.forEach(alias => this.aliasMap.set(alias, cmd));
            }
        });
    }

    handleMessage(msg) {
        const { content, guild, author } = msg;
        const wr = new WaffleResponse();

        if (!guild || !content || !author || author.bot) {
            return ;
        }

        const args = content.trim().split(/\s+/);

        // Escape if not equal to the prefix
        if (!prefixes.some(prefix => args[0].toLowerCase() === prefix)) return;

        // No second argument
        if (args.length === 1) {
            return wr.setResponse('Give me some syrup!').reply(msg);
        }

        // Get Command and re-map if it is an alias
        const { commands: cmds } = this;
        let cmd = args[1].toLowerCase();
        cmd = !cmds[cmd] ? this.aliasMap.get(cmd) : cmd; 

        // Not an acceptable command
        if (!cmd) {
            const replies = [
                `${args.slice(1).join(' ')}, that doesn't make any sense!`,
                'The heck are you expecting me to do?',
                'I know what you did last summer.'
            ];
            return wr.setResponse(randomFromArray(replies)).reply(msg);
        }

        const argsAfterCommand = args.slice(2).filter(arg => arg.length);

        // Runs command
        cmds[cmd].execute.apply(this, [msg, argsAfterCommand]);
    }

    executeFeed(msg) {
        new WaffleResponse().setResponse('OMNOMOMNOMOMNOM').reply(msg);
    }

    executeHelp(msg, args) {
        const wr = new WaffleResponse();
        const helpCategoriesArray = arrayFromObjectValues(this.helpCategory);
        const helpCategory = (args[0] || '').toLowerCase();

        // If non-valid help category supplied
        if (!args || !args.length || !helpCategoriesArray.filter(hc => hc.name.toLowerCase() === helpCategory).length) {
            const title = `Try typing 'help' with one of the following sub-help categories.`;
            const description = helpCategoriesArray.map(hc => `**${hc.name}**\n${hc.description}`).join('\n\n');
            return wr.setEmbeddedResponse({ title, description }).reply(msg);
        }

        // Collect the category help details
        const title = this.helpCategory[helpCategory].description;
        const description = arrayFromObjectValues(this.commands)
            .filter(itm => helpCategory === itm.helpCategory.name.toLowerCase())
            .map(itm => {
                const val = `**${itm.name}**\n${itm.description}`;
                return itm.aliases ? `${val} Alias: '${itm.aliases.join(`', '`)}'.`: val;
            }).join('\n\n');
        wr.setEmbeddedResponse({ title, description }).reply(msg);
    }

    executeHow(msg, args) {
        if (args.join(' ').toLowerCase().startsWith('old is ken')) {
            new WaffleResponse().setResponse('Kendron is a baby boi!').reply(msg);
        }
    }

    executeJoin(msg, args) {
        const wr = new WaffleResponse();
        if (!args || !args[0]) {
            return wr.setResponse('Please provide a valid voice channel name').reply(msg);
        }
        const channelToJoin = args[0];
        const validChannels = [];
        // Find voice channel to join
        msg.guild.channels.cache.forEach((channel, id) => {
            if (channel.type === 'voice' && channel.name === channelToJoin) {
                validChannels.push(channel);
            }
        });
        if (!validChannels || !validChannels[0]) {
            return wr.setResponse('Please provide an accurate voice channel name').reply(msg);
        }

        const dispatcher = this.gatsMusic._getDispatcher();
        if (dispatcher && dispatcher.paused) {
            return wr.setResponse('Please Unpause me to join another channel (:waffle: unpause)').reply(msg);
        }
        wr.setIsDirectReply(false);
        validChannels[0].join()
            .then(() => wr.setResponse(`✅ ~ Successfully connected to channel '${channelToJoin}'!`).reply(msg))
            .catch(err => wr.setResponse(`🚫 ~ Failed to connect to channel '${channelToJoin}'`).setError(err).reply(msg));
    }

    executeNani(msg) {
        new WaffleResponse().setResponse("*Nani the fuck did you just fucking iimasu about watashi, you chiisai bitch desuka? Watashi'll have anata know that watashi graduated top of my class in Nihongo 3, and watashi've been involved in iroirona Nihongo tutoring sessions, and watashi have over sanbyaku perfect test scores. Watashi am trained in kanji, and watashi is the top letter writer in all of southern California. Anata are nothing to watashi but just another weeaboo. Watashi will korosu anata the fuck out with vocabulary the likes of which has neber meen mimasu'd before on this continent, mark watashino fucking words. Anata thinks that anata can get away with hanashimasing that kuso to watashi over the intaaneto? Omou again, fucker. As we hanashimasu, watashi am contacting watashino secret netto of otakus accross the USA, and anatano IP is being traced right now so you better junbishimasu for the ame, ujimushi. The ame that korosu's the pathetic chiisai thing anata calls anatano life. You're fucking shinimashita'd, akachan.*").setLogResponseLimit(30).reply(msg);
    }

    executeOops(msg) {
        this.gatsMusic.removeLast(msg).then(wr => wr.reply(msg));
    }

    executePause(msg) {
        this.gatsMusic.pause(msg).then(wr => wr.reply(msg));
    }

    executePlay(msg, args) {
        this.gatsMusic.play(msg, args).then(wr => wr.reply(msg));
    }

    executePokeHint(msg) {
        this.pokemon.processNextPokeBotMessage(msg);
    }

    executeQueue(msg) {
        this.gatsMusic.queue(msg).then(wr => wr.reply(msg));
    }

    executeRepeat(msg) {
        this.gatsMusic.repeat(msg).then(wr => wr.reply(msg));
    }

    executeSalt(msg) {
        const saltReplies = [
            `:salt:`,
            `WHY ARE YOU BEING SO SALTY`,
            `https://www.youtube.com/watch?v=qDjPCMs7ivU`,
            `https://www.youtube.com/watch?v=xzpndHtdl9A`,
            `http://files.explosm.net/comics/Rob/soup.png`,
            `https://www.amazon.com/Morton-Salt-Regular-26/dp/B0005ZV1CQ`,
            `https://live.staticflickr.com/3953/15738368411_266702863c_b.jpg`,
            `https://ih0.redbubble.net/image.500606301.2517/raf,750x1000,075,t,fafafa:ca443f4786.u1.jpg`,
        ];
        const saltReply = randomFromArray(saltReplies);
        if (saltReply === `https://www.youtube.com/watch?v=qDjPCMs7ivU` && this.gatsMusic.isInVoiceChannel()) {
            this.gatsMusic.play(msg, [saltReply], { skipUserValidation: true });
        } else {
           msg.channel.send(saltReply);
        }
    }

    executeSay(msg, args) {
        let text;
        if (Math.random() > 0.14) {
            text = !args.length ? 'Can\'t repeat what isn\'t said, you naughty, naughty person' : args.join(' ');
        } else  {
            text = 'Sorry, I\'m not saying that... I don’t speak bullshit.'
        }
        new WaffleResponse().setResponse(text).reply(msg);
    }

    executeSkip(msg, args) {
        this.gatsMusic.skip(msg, Math.max(parseInt(args[0], 10) || 0, 0)).then(wr => wr.reply(msg));
    }

    executeSong(msg) {
        this.gatsMusic.song(msg).then(wr => wr.reply(msg));
    }

    executeTopFive(msg) {
        this.gatsScraper.getTopFive()
            .then(wr => {
                const fields = wr.response.map(p => { return { name: `**${p.points}**`, value: `#${p.position}   **${p.player}**` }});
                wr.setEmbeddedResponse({ fields }).reply(msg);
            })
            .catch(wr => {
                wr.reply(msg);
            });
    }

    executeUnpause(msg) {
        this.gatsMusic.unpause(msg).then(wr => wr.reply(msg));
    }
}

module.exports = MessageHandler;