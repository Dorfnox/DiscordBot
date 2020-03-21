const MongoClient = require('mongodb').MongoClient;
const { mongoDatabaseName, mongoDBUsername, mongoDBPassword } = require('./discordBotConfig.json').mongoDB;
 
// Wrapper class for performing operations on MongoDB
class WaffleMongo {

    // Only have one instance of DB active
    static mongoClient = null;

    static _connect() {
        // Do not perform if we already have an established connection
        if (!WaffleMongo._getClient()) {
            const mongDBUrl = `mongodb+srv://${mongoDBUsername}:${mongoDBPassword}@dorfnoxcluster-uwoxw.mongodb.net/test?retryWrites=true&w=majority`;
            MongoClient.connect(mongDBUrl, { useUnifiedTopology: true }, (err, mongoClient) => {
                if (err) {
                    return console.log("Error connecting to MongoDB: ", err);
                }
                console.log(`${mongoDBUsername} connected successfully to MongoDB server`);
                WaffleMongo._setClient(mongoClient);
            });
        }
    }

    static _getClient() {
        return WaffleMongo.mongoClient;
    }

    static _setClient(val) {
        WaffleMongo.mongoClient = val;
    }

    static _disconnect() {
        const client = WaffleMongo._getClient();
        if (client) {
            client.close();
            console.log(`${mongoDBUsername} disconnected from MongoDB server`);
            WaffleMongo._setClient(null);
        }
    }

    static _getDatabase() {
        const client = WaffleMongo._getClient();
        return client ? client.db(mongoDatabaseName) : null;
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~ //

    constructor(collection) {
        this.collection = collection;
    }
}

// Initial connect to server
WaffleMongo._connect();

module.exports = WaffleMongo;