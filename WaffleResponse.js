const { randomFromArray } = require('./WaffleUtil');

class WaffleResponse {

    // Waffle colour spectrum
    colors = [0x8B5F2B, 0x986C33, 0xA5793D, 0xB08646, 0xBB9351, 0xC69D4E, 0xD0A74B, 0xD9B249, 0xE2BE47, 0xEBCA46, 0xF3D745];

    constructor(response) {
        this.response = response || '';
        this.error = '';
        this.errorLocale = '';
        this.isError = false;
        this.isLoggable = true;
        this.isSendable = true;
        this.isDirectReply = false;
    }

    setResponse(response) {
        this.response = response;
        return this;
    }

    setError(error) {
        this.error = error;
        return this.setIsError(this.error ? true : false);
    }

    setErrorLocale(errorLocale) {
        this.errorLocale = errorLocale;
        return this.setIsError(this.errorLocale ? true : false);
    }

    setIsError(isError) {
        this.isError = isError;
        return this;
    }

    setIsLoggable(isLoggable) {
        this.isLoggable = isLoggable;
        return this;
    }

    setIsSendable(isSendable) {
        this.isSendable = isSendable;
        return this;
    }

    setIsDirectReply(isDirectReply) {
        this.isDirectReply = isDirectReply;
        if (isDirectReply) {
            this.setIsSendable(true);
        }
        return this;
    }

    setEmbeddedResponse(options = {}) {
        const defaultOptions = {
            color: randomFromArray(this.colors),
        }
        const embed = Object.assign(defaultOptions, options);
        return this.setResponse({ embed });
        //https://i.ytimg.com/vi/paZ2PaXdpGw/hqdefault.jpg
    }

    async reply(msg) {
        const logger = this.isError ? console.error : console.log;
        if (this.isLoggable) {
            const username = msg && msg.member ? msg.member.user.username : 'unknownUser';
            const errorLocale = this.errorLocale ? ` | ${this.errorLocale}` : '';
            const error = this.error ? `\n_e_${this.error}` : '';
            logger(`[${Date.now()} | ${username}${errorLocale}]\n_r_${this.response}${error}`);
        }
        if (msg && this.isSendable && this.response) {
            if (this.isDirectReply) {
                await msg.reply(this.response);
            }
            else await msg.channel.send(this.response);
        }
        return this;
    }
}

module.exports = WaffleResponse;