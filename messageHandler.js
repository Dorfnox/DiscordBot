const prefix = 'wfl';

const MessageHandler = {
    handleMessage: message => {
        const { content } = message;
        // Escape if not equal to the prefix
        if (content.substr(0, prefix.length) !== prefix) {
            return;
        }
        const args = content.split(' ');

        // No second argument
        if (args.length === 1) {
            message.reply('Give me some syrup!');

        // Not an acceptable command
        } else if (!Object.keys(Commands).includes(args[1].toLowerCase())) {
            const replies = [
                `${args[1]}, my ass!`,
                'The fuck you expecting me to do?',
                'I know what you did last summer.'
            ]
            message.reply(replies[Math.floor((Math.random() * replies.length))]);

        // Runs command
        } else {
            Commands[args[1].toLowerCase()](message);
        }
        console.log('message', message, '\n');
    }
}

const Commands = {
    'feed': msg => {
        msg.reply('OMNOM');
    }
}

module.exports = {
    MessageHandler
}