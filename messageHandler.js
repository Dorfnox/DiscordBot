const config = require('./discordBotConfig.json');
const { GatsScraper } = require('./gatsScraper');
const GatsMusic = require('./gatsMusic');
const { prefixes } = config.chat;

class MessageHandler {
    constructor(client) {
        this.client = client;
        this.gatsMusic = new GatsMusic(client);
        this.commands = {
            'feed': {
                execute: this.executeFeed,
                description: 'give wfl waffles!',
            },
            'help': {
                execute: this.executeHelp,
                description: 'command waffle with waffle|wfl|w|:waffle: + *command*',
            },
            'how': {
                execute: this.executeHow,
                description: 'try \'how old is kendron\' to find out Kendron\'s age!',
            },
            'j': {
                execute: this.executeJoin,
                description: 'see *join*',
            },
            'join': {
                execute: this.executeJoin,
                description: 'provide the name of a VOICE CHANNEL to join',
            },
            'nani': {
                execute: this.executeNani,
                description: 'uwu notice me senpai',
            },
            'p': {
                execute: this.executePlay,
                description: 'see *play*',
            },
            'pause': {
                execute: this.executePause,
                description: 'pause the current song',
            },
            'play': {
                execute: this.executePlay,
                description: 'play a song via description/youtube-link. Also unpauses.',
            },
            'q': {
                execute: this.executeQueue,
                description: 'see *queue*',
            },
            'queue': {
                execute: this.executeQueue,
                description: 'displays the current songs in the queue.',
            },
            'oops': {
                execute: this.executeOops,
                description: 'removes the last song you accidentally entered into the queue.'
            },
            'say': {
                execute: this.executeSay,
                description: 'I will repeat what you say :D',
            },
            'skip': {
                execute: this.executeSkip,
                description: 'stops the current song, or removes from queue (eg: *skip 3*).',
            },
            'stop': {
                execute: this.executeSkip,
                description: 'see *skip*',
            },
            'top5': {
                execute: this.executeTopFive,
                description: 'get the top five players from the gats leaderboard',
            },
            'unpause': {
                execute: this.executeUnpause,
                description: 'unpause the current song',
            }
        }
    }

    handleMessage(msg) {
        const { content, guild, author } = msg;

        // Problem was logged here: https://github.com/discordjs/discord.js/issues/3910
        // Ignore anything not sent from a guild, no content, or if author is a bot
        // console.log("MESSAGE", msg);
        // console.log("CONTENT", content);
        // console.log("GUILD", guild);
        // console.log("AUTHORR", author);
        if (!guild || !content || !author || author.bot) {
            return ;
        }

        const args = content.trim().split(/\s+/);

        // Escape if not equal to the prefix
        if (!prefixes.some(prefix => args[0].toLowerCase() === prefix)) return;

        // No second argument
        if (args.length === 1) {
            return msg.reply('Give me some syrup!');
        }

        const { commands: cmds } = this;
        const cmd = args[1].toLowerCase();

        // Not an acceptable command
        if (!Object.keys(cmds).includes(cmd)) {
            const replies = [
                `${args.slice(1).join(' ')}, my ass!`,
                'The fuck you expecting me to do?',
                'I know what you did last summer.'
            ];
            return msg.reply(replies[Math.floor((Math.random() * replies.length))]);
        }

        const argsAfterCommand = args.slice(2).filter(arg => arg.length);

        // Runs command
        cmds[cmd].execute.apply(this, [msg, argsAfterCommand]);
    }

    executeFeed(msg) {
        msg.channel.send('OMNOMOMNOMOMNOM');
    }

    executeHelp(msg) {
        const { commands } = this;
        const text = Object.keys(commands)
            .map(cmd => `> **${cmd}**:\t ${commands[cmd].description}`)
            .join('\n');
        msg.channel.send(text);
    }

    executeHow(msg, args) {
        if (args.join(' ').toLowerCase().startsWith('old is ken')) {
            msg.channel.send('Kendron is a baby boi!');
        }
    }

    executeJoin(msg, args) {
        if (!args || !args[0]) {
            return msg.reply('Please provide a voice channel name, dimwit');
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
            return msg.reply('Please provide an accurate voice channel name, dimwit');

        }
        const dispatcher = this.gatsMusic._getDispatcher();
        if (dispatcher && dispatcher.paused) {
            return msg.reply('Please Unpause me to join another channel (:waffle: unpause)');
        }
        validChannels[0].join()
            .then(() => {
                const text = `✅ ~ Successfully connected to channel '${channelToJoin}'!`;
                console.log(text);
                msg.channel.send(text);
            })
            .catch(err => {
                const text = `🚫 ~ Failed to connect to channel '${channelToJoin}'`;
                console.error(text, err);
                msg.reply(text);
            });
    }

    executeNani(msg) {
        msg.channel.send("*Nani the fuck did you just fucking iimasu about watashi, you chiisai bitch desuka? Watashi'll have anata know that watashi graduated top of my class in Nihongo 3, and watashi've been involved in iroirona Nihongo tutoring sessions, and watashi have over sanbyaku perfect test scores. Watashi am trained in kanji, and watashi is the top letter writer in all of southern California. Anata are nothing to watashi but just another weeaboo. Watashi will korosu anata the fuck out with vocabulary the likes of which has neber meen mimasu'd before on this continent, mark watashino fucking words. Anata thinks that anata can get away with hanashimasing that kuso to watashi over the intaaneto? Omou again, fucker. As we hanashimasu, watashi am contacting watashino secret netto of otakus accross the USA, and anatano IP is being traced right now so you better junbishimasu for the ame, ujimushi. The ame that korosu's the pathetic chiisai thing anata calls anatano life. You're fucking shinimashita'd, akachan.*");
    }

    executeOops(msg) {
        this.gatsMusic.removeLast(msg);
    }

    executePause(msg) {
        this.gatsMusic.pause(msg);
    }

    executePlay(msg, args) {
        this.gatsMusic.play(msg, args);
    }

    executeQueue(msg) {
        const queue = this.gatsMusic.getSimpleQueue();
        let text;
        if (!queue.length) {
            text = '*There are no songs in the queue*';
        } else {
            const dispatcher = this.gatsMusic._getDispatcher();
            const playText = (dispatcher && dispatcher.paused) ? '***Paused***' : '***Now Playing***';
            text = queue.map((r, i, all) => {
                if (i === 0) {
                    return `${playText}\n\`\`\`css\n${r.author.username} with ${r.title}\`\`\`${all.length > 1 ? '***Queue***' : ''}`;
                }
                return `> #${i} ~ ${r.author.username} with **${r.title}**`;
            }).join('\n');
        }
        msg.channel.send(text);
    }

    executeSay(msg, args) {
        let text;
        if (Math.random() > 0.14) {
            text = !args.length ? 'Can\'t repeat what isn\'t said, you naughty, naughty person' : args.join(' ');
        } else  {
            text = 'Sorry, I\'m not saying that... I don’t speak bullshit.'
        }
        msg.channel.send(text);
    }

    executeSkip(msg, args) {
        this.gatsMusic.skip(msg, Math.max(parseInt(args[0], 10) || 0, 0));
    }

    executeTopFive(msg) {
        GatsScraper.getTopFive(topFive => {
            const text = topFive
                .map((p, idx) => `> **${p.position}**\t${p.player} ${p.points}`)
                .join('\n');
            msg.channel.send(text);
        });
    }

    executeUnpause(msg) {
        this.gatsMusic.unpause(msg);
    }
}

module.exports = MessageHandler;