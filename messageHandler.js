const { GatsScraper } = require('./gatsScraper')
const prefix = 'wfl';

const MessageHandler = {
    handleMessage: message => {
        const { content } = message;
        // Escape if not equal to the prefix
        if (content.substr(0, prefix.length).toLowerCase() !== prefix) {
            return;
        }
        const args = content.split(' ');

        // No second argument
        if (args.length === 1) {
            message.reply('Give me some syrup!');
            return ;
        }

        const command = args[1].toLowerCase();
        // Not an acceptable command
        if (!Object.keys(Commands).includes(command)) {
            const replies = [
                `${args[1]}, my ass!`,
                'The fuck you expecting me to do?',
                'I know what you did last summer.'
            ]
            message.reply(replies[Math.floor((Math.random() * replies.length))]);
            return ;
        }

        // Runs command
        Commands[command](message);
    }
}

const Commands = {
    'feed': msg => {
        msg.reply('OMNOM');
    },
    'top5': msg => {
        GatsScraper.getTopFive(topFive => {
            const text = topFive.map((p, idx) => `> **${p.position}**\t${p.player} ${p.points}`).join('\n');
            msg.channel.send(text)
        });
    },
}

module.exports = {
    MessageHandler
}