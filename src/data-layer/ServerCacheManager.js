const WaffleMongo = require("./WaffleMongo");
const { jsonCopy } = require("../util/WaffleUtil");

class ServerCacheManager {
  constructor(collectionName, defaultDocumentData = {}) {
    this.collectionName = collectionName;
    this.defaultDocumentData = defaultDocumentData;
    // Map of id -> documentData
    this.documentCache = new Map();
    this.mongoData = new WaffleMongo(collectionName);
  }

  /* HAS-SERS */

  hasInCache(_id) {
    return this.documentCache.has(_id);
  }

  /* GETTERS */
  get(_id, defaultDocumentData = null) {
    return this.getFromCache(_id).then((documentData) => {
      if (documentData) {
        return documentData;
      }
      return this.getFromCollection(_id).then((newDocumentData) => {
        if (newDocumentData) {
          return this.setToCache(_id, newDocumentData);
        }
        return this.set(
          _id,
          jsonCopy(defaultDocumentData || this.defaultDocumentData)
        );
      });
    });
  }

  getFromCache(_id) {
    return Promise.resolve(this.documentCache.get(_id));
  }

  getFromCollection(_id) {
    return this.mongoData.findOne({ _id });
  }

  /* SETTERS */
  set(_id, documentData, cacheData = null) {
    return this.setToCollection(_id, documentData).then(() =>
      this.setToCache(_id, cacheData || documentData)
    );
  }

  setToCache(_id, documentData) {
    this.documentCache.set(_id, documentData);
    return Promise.resolve(documentData);
  }

  setToCollection(_id, documentData) {
    return this.mongoData
      .updateOneOrInsert({ _id }, { $set: documentData })
      .then(() => {
        return { _id, ...documentData };
      });
  }

  /* DELETERS */
  delete(_id) {
    return this.deleteFromCollection(_id).then((res) => {
      return this.deleteFromCache(_id);
    });
  }

  deleteFromCache(_id) {
    return Promise.resolve(this.documentCache.delete(_id));
  }

  deleteFromCollection(_id) {
    return this.mongoData.deleteOne({ _id });
  }
}

module.exports = ServerCacheManager;
