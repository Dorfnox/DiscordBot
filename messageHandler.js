const config = require('./discordBotConfig.json');
const { GatsScraper } = require('./gatsScraper');
const GatsMusic = require('./gatsMusic');
const { prefixes } = config.chat;

class MessageHandler {
    constructor(client) {
        this.client = client;
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
            'nani': {
                execute: this.executeNani,
                description: 'UwU',
            },
            'play': {
                execute: this.executePlay,
                description: 'play a song by providing a description/youtube-link.',
            },
            'queue': {
                execute: this.executeQueue,
                description: 'displays the current songs in the queue.',
            },
            'say': {
                execute: this.executeSay,
                description: 'I will repeat what you say :D',
            },
            'stop': {
                execute: this.executeStop,
                description: 'stop the current song, and skips to the next song',
            },
            'top5': {
                execute: this.executeTopFive,
                description: 'get the top five players from the gats leaderboard',
            }
        }
    }

    handleMessage(msg) {
        const { content } = msg;
        const args = content.trim().split(/\s+/);

        // Escape if not equal to the prefix
        if (!prefixes.some(prefix => args[0].toLowerCase() === prefix)) {
            return;
        }

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
            ]
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

    executeNani(msg) {
        msg.channel.send("*Nani the fuck did you just fucking iimasu about watashi, you chiisai bitch desuka? Watashi'll have anata know that watashi graduated top of my class in Nihongo 3, and watashi've been involved in iroirona Nihongo tutoring sessions, and watashi have over sanbyaku perfect test scores. Watashi am trained in kanji, and watashi is the top letter writer in all of southern California. Anata are nothing to watashi but just another weeaboo. Watashi will korosu anata the fuck out with vocabulary the likes of which has neber meen mimasu'd before on this continent, mark watashino fucking words. Anata thinks that anata can get away with hanashimasing that kuso to watashi over the intaaneto? Omou again, fucker. As we hanashimasu, watashi am contacting watashino secret netto of otakus accross the USA, and anatano IP is being traced right now so you better junbishimasu for the ame, ujimushi. The ame that korosu's the pathetic chiisai thing anata calls anatano life. You're fucking shinimashita'd, akachan.*");
    }

    executePlay(msg, args) {
        GatsMusic.play(this.client, msg, args);
    }

    executeQueue(msg) {
        const queue = GatsMusic.getSimpleQueue(msg);
        let text;
        if (!queue.length) {
            text = '*There are no songs in the queue*';
        } else {
            text = queue.map((r, i, all) => {
                if (i === 0) {
                    return `***Now Playing***\n\`\`\`css\n${r.author.username} with ${r.title}\`\`\`${all.length > 1 ? '***Queue***' : ''}`;
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

    executeStop(msg, args) {
        GatsMusic.stop(this.client, msg);
    }

    executeTopFive(msg) {
        GatsScraper.getTopFive(topFive => {
            const text = topFive
                .map((p, idx) => `> **${p.position}**\t${p.player} ${p.points}`)
                .join('\n');
            msg.channel.send(text);
        });
    }
}

module.exports = MessageHandler;