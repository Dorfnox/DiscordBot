const MongoClient = require('mongodb').MongoClient;
const { mongoDatabaseName, mongoDBUsername, mongoDBPassword } = require('./discordBotConfig.json').mongoDB;
 
// Wrapper class for performing operations on MongoDB
class WaffleMongo {

    // Only have one instance of DB active
    static mongoClient = null;

    constructor(collection) {
        this.connect();
        this.collection = collection;
    }

    connect() {
        // Do not perform if we already have an established connection
        if (!this._getClient()) {
            const mongDBUrl = `mongodb+srv://${mongoDBUsername}:${mongoDBPassword}@dorfnoxcluster-uwoxw.mongodb.net/test?retryWrites=true&w=majority`;
            MongoClient.connect(mongDBUrl, { useUnifiedTopology: true }, (err, mongoClient) => {
                if (err) {
                    return console.log("Error connecting to MongoDB: ", err);
                }
                console.log(`${mongoDBUsername} connected successfully to MongoDB server`);
                this._setClient(mongoClient);
                this._initCollections();
            });
        }
    }

    disconnect() {
        const client = this._getClient();
        if (client) {
            client.close();
            console.log(`${mongoDBUsername} disconnected from MongoDB server`);
            this._setClient(null);
        }
    }

    _getClient() {
        return WaffleMongo.mongoClient;
    }

    _setClient(val) {
        WaffleMongo.mongoClient = val;
    }

    _getDatabase() {
        const client = this._getClient();
        return client ? client.db(mongoDatabaseName) : null;
    }
}

module.exports = WaffleMongo;