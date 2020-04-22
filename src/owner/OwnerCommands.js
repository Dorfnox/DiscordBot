const WaffleResponse = require("../message/WaffleResponse");
const { ownerIds } = require("../../configWaffleBot").owner;

class OwnerCommands {

  constructor(client) {
    this.client = client;
  }

  setStatus(msg, args = []) {
    const { id } = msg.author;
    // Only allow a user who is the owner to
    if (this._isOwner(msg)) {
      const name = args.join(' ');
      this.client.user.setPresence({ activity: { name, type: 'PLAYING' }});
      new WaffleResponse().setResponse(`(>^_^)> *New Actvity Status* <(^_^<)\n**${name}**`).reply(msg);
    }
  }

  _isOwner(msg) {
    return ownerIds.indexOf(msg.author.id) !== -1;
  }
}

module.exports = OwnerCommands;
