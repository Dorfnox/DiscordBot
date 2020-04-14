const WaffleMongo = require('../data-layer/WaffleMongo');
const WaffleResponse = require('../message/WaffleResponse');
const { modMailChannelCategoryName } = require('../../configWaffleBot.json').modMail;
 

class WaffleMail {

    static initModMail() {
    }

    constructor(client) {
        this.client = client;
        this.mongolMail = new WaffleMongo('modMail');
        this.mongolMailUsers = new WaffleMongo('modMailUsers');
    }

    handleDM(msg) {
        const wr = new WaffleResponse();

        // Validate channel to send modMail to
        const guildMap = this._getSharedGuildMap(msg);
        if (guildMap.size !== 1) {
            return this._validateMailChannel(msg, guildMap);
        }

        const guild = guildMap.first();
        const { id: guildId } = guild;
        const { id: authorId, username, discriminator } = msg.author;

        // Create Channel in Server if Necessary
        this.mongolMail.find({ guildId })
            .then(mail => {
                if (mail.length === 0) {
                    return this.mongolMail.insertOne({
                        guildId,
                        categoryChannel: {},
                        channels: []
                    });
                }
                return mail[0];
            })
            .then(ops => {
                // Create Category channel if there is none
                if (!ops.categoryChannel.name) {
                    ops.categoryChannel = {
                        name: modMailChannelCategoryName,
                    }
                    return this.mongolMail.updateOne(ops)
                }
                return ops;
            })
            .then(ops => {
                // Create Channel if there is none
                let channel = ops.channels.filter(ch => ch.authorId === authorId);
                if (channel.length === 0) {
                    channel = [{
                        authorId,
                        name: `${username.toLowerCase()}-${discriminator}`
                    }];
                    ops.channels.push(channel[0]);
                    return this.mongolMail.updateOne(ops);
                }
                return ops;
            })
            .then(ops => {
                console.log(ops);
            });
    }

    _validateMailChannel(msg, guildMap) {
        const wr = new WaffleResponse();
        if (guildMap.size !== 1) {
            // TODO: Add MORE channel message consumer validation
            wr.setEmbeddedResponse({ description: 'no' }).reply(msg);
            return false;
        }
        return true;
    }

    _getSharedGuildMap(msg) {
        const { id: userId } = msg.author;
        return this.client.guilds.cache.filter(g => g.members.cache.filter(gm => gm.user.id === userId ));
    }
}

module.exports = WaffleMail;