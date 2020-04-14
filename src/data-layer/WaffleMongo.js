const MongoClient = require('mongodb').MongoClient;

const { getSafe } = require('../util/WaffleUtil');
const { mongoDatabaseName, mongoDBUsername, mongoDBPassword } = require('../../configWaffleBot.json').mongoDB;

 
// Wrapper class for performing operations on MongoDB
class WaffleMongo {

    // Only have one instance of DB active
    static mongoClient = null;

    static async _connect() {
        // Do not perform if we already have an established connection
        if (!WaffleMongo._getClient()) {
            const mongDBUrl = `mongodb+srv://${mongoDBUsername}:${mongoDBPassword}@dorfnoxcluster-uwoxw.mongodb.net/test?retryWrites=true&w=majority`;
            return await MongoClient.connect(mongDBUrl, { useUnifiedTopology: true })
                .then(mongoClient => {
                    console.log(`${mongoDBUsername} connected successfully to MongoDB server`);
                    WaffleMongo._setClient(mongoClient);
                })
                .catch(err => {
                    console.log("Error connecting to MongoDB: ", err);
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
        return getSafe(() => WaffleMongo._getClient().db(mongoDatabaseName), null);
    }

    // ~~~~~~~~~~~~~~~~~~~~~~~~ //

    constructor(collectionName) {
        this.collectionName = collectionName;
    }

    getCollection() {
        return getSafe(() => WaffleMongo._getDatabase().collection(this.collectionName));
    }

    find(findArgs) {
        const collection = this.getCollection();
        if (collection) {
            return collection.find(findArgs).toArray()
                .catch(err => {
                    console.log('Error performing find: ', err);
                    throw err;
                });
        }
        return Promise.reject('No collection');
    }

    insertOne(insertArgs) {
        const collection = this.getCollection();
        if (collection) {
            return collection.insertOne(insertArgs)
                .then(res => res.ops[0])
                .catch(err => {
                    console.log('Error performing insertOne: ', err);
                    throw err;
                });
        }
        return Promise.reject('No collection');
    }

    insertMany(insertArgs) {
        const collection = this.getCollection();
        if (collection) {
            return collection.insertMany(insertArgs)
                .then(res => res.ops)
                .catch(err => {
                    console.log('Error performing insertMany: ', err);
                    throw err;
                });
        }
        return Promise.reject('No collection');
    }

    updateOne(updateArgs) {
        const collection = this.getCollection();
        if (collection) {
            const { _id } = updateArgs;
            return collection.updateOne({ _id }, { $set: updateArgs })
                .then(_ => updateArgs)
                .catch(err => {
                    console.log('Error performing updateOne: ', err);
                    throw err;
                });
        }
        return Promise.reject('No collection');
    }

}

// Initial connect to MongoDB server
(async () => {
    await WaffleMongo._connect();
})();

module.exports = WaffleMongo;