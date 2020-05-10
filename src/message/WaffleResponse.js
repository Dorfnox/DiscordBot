const { getSafe, randomWaffleColor } = require('../util/WaffleUtil');

class WaffleResponse {

    constructor(response) {
        this.response = response || '';
        this.error = '';
        this.errorLocale = '';
        this.isError = false;
        this.isLoggable = true;
        this.isSendable = true;
        this.isDirectReply = false;
        this.logResponseLimit = 40;
    }

    setEmbeddedResponse(options = {}) {
        const defaultOptions = {
            color: randomWaffleColor(),
        }
        const embed = Object.assign(defaultOptions, options);
        this.response = { embed };
        return this;
    }

    setError(error) {
        this.error = error && error.message ? error.message : error;
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

    setLogResponseLimit(limit) {
        this.logResponseLimit = Math.max(limit || 0, 0);
        return this;
    }

    setResponse(response) {
        if (typeof response === 'string') {
            return this.setEmbeddedResponse({ description: response });
        }
        this.response = response;
        return this;
    }

    async reply(msg, cb = null) {
      let replyMsg = null;
      try {
        if (msg && this.isSendable && this.response) {
          if (this.isDirectReply) {
            replyMsg = await msg.reply(this.response);
          } else {
            replyMsg = await msg.channel.send(this.response);
          }
        }
      } catch (err) {
        console.log('Could not reply: ', err);
        replyMsg = null;
      }
      // Log results without blocking main 'thread'
      if (this.isLoggable) {
        const now = new Date().toISOString();
        setTimeout(() => {
          getSafe(() => {
            const logger = this.isError ? console.error : console.log;
            const username = getSafe(() => msg.member.user.username, 'unknownUser');
            const errorLocale = this.errorLocale ? ` | ${this.errorLocale}` : '';
            const logMsg = `\n__MSG ${getSafe(() => msg.content || '', '')}`;
            const response = `\n__RES ${JSON.stringify(this.response.embed || this.response)}`;
            const logResponse = this.logResponseLimit > -1 ?
                `${response.substr(0, this.logResponseLimit)}${this.logResponseLimit < response.length ? `... +${response.length - this.logResponseLimit} more chars` : ''}` :
                response;
            const logError = this.error ? `\n__ERR ${JSON.stringify(this.error || '')}` : '';
            logger(`[${now} | ${username}${errorLocale}] ${logMsg}${logResponse}${logError}\n`);
          }, null, err => console.error('WR LOG ERROR: ', err, '\n'));
        }, 100);
      }
      if (cb) {
        replyMsg ? cb(replyMsg) : cb(null, 'Did not reply');
      }
      return this;
    }
}

module.exports = WaffleResponse;