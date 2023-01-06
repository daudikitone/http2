class DataStore {
    constructor(storage, cache = {}) {
        this.schemas = {}
        this.storeDrivers = {}
        this.storage = storage
        this.cacheStore = cache
    }

    setPrivateKeys(keys) {
        return !!(this.privateKeys = keys)
    }

    assignStoreDriver(driverId, application, schema) {
        this.schemas[driverId] = schema
        this.storeDrivers[driverId] = application 
        this.storage.assignStoreKey(driverId)
    }

    storeRecord(record, callback) {
        return this.storage.storeRecord(
            record.recordDriver, 
            this.storeDrivers[record.recordDriver](record.data),
            callback
        )
    }
}

module.exports = {DataStore}