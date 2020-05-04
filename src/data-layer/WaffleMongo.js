const MongoClient = require("mongodb").MongoClient;

const { getSafe } = require("../util/WaffleUtil");
const {
  mongoDatabaseName,
  mongoDBUsername,
  mongoDBPassword,
} = require("../../configWaffleBot.json").mongoDB;

// Wrapper class for performing operations on MongoDB
class WaffleMongo {
  // Only have one instance of DB active
  static mongoClient = null;

  static connect() {
    // Do not perform if we already have an established connection
    const client = WaffleMongo._getClient();
    if (client) {
      return Promise.resolve(client);
    }
    const mongDBUrl = `mongodb+srv://${mongoDBUsername}:${mongoDBPassword}@dorfnoxcluster-uwoxw.mongodb.net/test?retryWrites=true&w=majority`;
    return MongoClient.connect(mongDBUrl, { useUnifiedTopology: true })
      .then((mongoClient) => WaffleMongo._setClient(mongoClient))
      .catch((err) => {
        console.log("Error connecting to MongoDB: ", err);
        throw err;
      });
  }

  static _getClient() {
    return WaffleMongo.mongoClient;
  }

  static _setClient(val) {
    WaffleMongo.mongoClient = val;
    return val;
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

  _getCollection() {
    return getSafe(() =>
      WaffleMongo._getDatabase().collection(this.collectionName)
    );
  }

  find(findArgs, opts = null) {
    const collection = this._getCollection();
    if (collection) {
      return collection
        .find(findArgs, opts)
        .toArray()
        .catch((err) => {
          console.log("Error performing find: ", err);
          throw err;
        });
    }
    return Promise.reject("No collection");
  }

  insertOne(insertArgs) {
    const collection = this._getCollection();
    if (collection) {
      return collection
        .insertOne(insertArgs)
        .then((res) => res.ops[0])
        .catch((err) => {
          console.log("Error performing insertOne: ", err);
          throw err;
        });
    }
    return Promise.reject("No collection");
  }

  insertOneIfNotExists(findArgs, insertArgs) {
    const collection = this._getCollection();
    if (!collection) {
      return Promise.reject("No collection");
    }
    return collection
      .updateOne(findArgs, { $setOnInsert: insertArgs }, { upsert: true })
      .then((res) => res.result)
      .catch((err) => {
        console.log("Error performing insertMany: ", err);
        throw err;
      });
  }

  insertMany(insertArgs) {
    // const collection = this._getCollection();
    // if (collection) {
    //   return collection
    //     .insertMany(insertArgs)
    //     .then((res) => res.ops)
    //     .catch((err) => {
    //       console.log("Error performing insertMany: ", err);
    //       throw err;
    //     });
    // }
    // return Promise.reject("No collection");
  }

  insertManyIfNotExists(insertArgs) {
    // const collection = this._getCollection();
    // if (!collection) {
    //   return Promise.reject("No collection");
    // }
    // return collection
    //   .update(insertArgs)
    //   .then((res) => res.ops)
    //   .catch((err) => {
    //     console.log("Error performing insertMany: ", err);
    //     throw err;
    //   });
  }

  updateOne(filter, updateArgs) {
    const collection = this._getCollection();
    if (!collection) {
      return Promise.reject("No collection");
    }
    return collection
      .updateOne(filter, updateArgs)
      .then((res) => res.result)
      .catch((err) => {
        console.log("updateOne err: ", err);
        throw err;
      });
  }
}

module.exports = WaffleMongo;
