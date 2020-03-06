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
                description: 'what commands does this bot have?',
            },
            'how': {
                execute: this.executeHow,
                description: 'try \'how old is kendron\' to find out Kendron\'s age!',
            },
            'play': {
                execute: this.executePlay,
                description: 'play a song by providing a description/youtube-link.',
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

    executePlay(msg, args) {
        GatsMusic.play(this.client, msg, args);
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