const config = require('./discordBotConfig.json');
const { GatsScraper } = require('./gatsScraper');
const GatsMusic = require('./gatsMusic');
const { prefix } = config.chat;

class MessageHandler {
    constructor(client) {
        this.client = client;
        this.commands = {
            'feed': {
                position: 1,
                execute: this.executeFeed,
                description: 'give wfl waffles!',
            },
            'help': {
                position: 2,
                execute: this.executeHelp,
                description: 'what commands does this bot have?',
            },
            'how': {
                position: 3,
                execute: this.executeHow,
                description: 'try \'how old is kendron\' to find out Kendron\'s age!',
            },
            'play': {
                position: 4,
                execute: this.executePlay,
                description: 'play a song by providing a description/youtube-link.',
            },
            'top5': {
                position: 5,
                execute: this.executeTopFive,
                description: 'get the top five players from the gats leaderboard',
            }
        }
    }

    handleMessage(msg) {
        const { content } = msg;
        // Escape if not equal to the prefix
        if (content.substr(0, prefix.length).toLowerCase() !== prefix) {
            return;
        }
        const args = content.trim().split(' ');

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
            .map(cmd => { return {
                position: commands[cmd].position,
                description: `> **${cmd}**:\t ${commands[cmd].description}`
            }})
            .sort((a, b) => a.position > b.position)
            .map(itm => itm.description)
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