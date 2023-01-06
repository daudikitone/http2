const basenamePattern = /\b(?:\/|\\)([^\/\\]*?[.]\w+?)$/

function retrieveBasename(filepath) {
    function patternityTest(patternity) {
        return patternity ? patternity[1] : null
    }
    return patternityTest(basenamePattern.exec(filepath))
}

class Storage {
    constructor(folder, fs, extenstions = {}) {
        this.files = {}
        this.FS_PROXY = fs
        this.folder = folder
        this.privateKeys = []
        this.defaultSnapshotPath = `${this.folder}/snapshots.txt`
        this.extenstionSlots = ['cacheStore', 'handleSnapshot']

        // Features enhancement
        this.cacheStore = extenstions.cacheStore
        this.handleSnapshot = extenstions.handleSnapshot

        this.snapShotSaver = async function(snapShot) {
            function registeredHandler(that, snap_shot) {
                if (that.handleSnapshot) {
                    that.handleSnapshot(snap_shot)
                        .then(() => defaultHandler(that, snap_shot))
                        .catch(error => {
                            /*
                                Something must be done before invoking defaultHanlder()
                                Perhaps send an email or anything but snapshot errors
                                should never be the cause of detaching a route i.e
                                No error must be thrown
                            */ 
                            console.log('Registered handleSnapshot() encountered errors')
                            console.error(error)
                            defaultHandler(that, snap_shot)
                        })
                }

                else defaultHandler(that, snap_shot)
            }

            function defaultHandler(that, snap_shot) {
                return that.saveSnapshot(snap_shot)
            }

            return registeredHandler(this, snapShot)
        }

        configSnapshotStore(this)
        verifyExtentions(this, Object.keys(extenstions))

        function verifyExtentions(that, extList) {
            if (extList.length <= 0) return

            extList.forEach(ext => {
                if (!that.extenstionSlots.includes(ext)) {
                    console.log(`[WARNING]: Storage encountered unsupported extension`)
                }

                if (ext === 'handleSnapshot') {
                    if (!(that.handleSnapshot.constructor.name === 'AsyncFunction')) {
                        throw new Error(`handleSnapshot extension of Storage must be AsyncFunction`)
                    }
                }
            });
        }

        function configSnapshotStore(that) {
            that.FS_PROXY.readdir(that.folder)
                .then(folderContents => {
                    if (folderContents.includes(
                        retrieveBasename(that.defaultSnapshotPath)
                    )) return

                    that.FS_PROXY.writeFile(
                        `${that.defaultSnapshotPath}`,
                        `SNAPSHOTS RECORDS ==== SINCE ==== ${new Date()}` + '\n\n', 
                        'utf8'
                    )
                        .then(() => console.log('SnapshotStore configured successfully'))
                        .catch(error => {
                            console.log('Failed to configure SnapshotStore')
                            throw error
                        })
                })
                .catch(error => {
                    if (error.code === 'ENOENT') {
                        console.log(`Storage couldn't find a folder [${that.folder}]`)
                        throw error
                    }

                    throw error
                })
        }
    }

    setPrivateKeys(keys) {
        return !!(this.privateKeys = keys)
    }

    assignStoreKey(filepath) {
        this.files[filepath] = `${this.folder}/${filepath}.json`
        this.configStoreKey(filepath)
    }

    getPublicVersion(record) {
        const publicRecord = {}
        
        for (const key of Object.keys(record)) {
            if(!(this.privateKeys.includes(key))) {
                publicRecord[key] = record[key]
            }
        }
        
        return publicRecord
    }
 
    registerDataPath(filepath) {
        this.FS_PROXY.writeFile(
            `${this.folder}/${filepath}.json`, 
            JSON.stringify([])
        ).then()
            .catch(e => {throw e})
    }

    saveSnapshot(snap_shot) {
        if (!(typeof snap_shot === 'string')) {
            try {
                snap_shot = JSON.stringify(snap_shot)
            }

            catch (e) {
                let snapshotHeader = 'Snapshot corruption during serialization' + '\n';
                snapshotHeader = snapshotHeader + `[ERROR NOTE]: ${e.message || e}` + '\n';
                snap_shot = snapshotHeader + String(snap_shot)
                /*
                    There must be default serialization once JSON failed to
                    stringify snap_shot. The default one must provide the 
                    output that retain quality unlike the default toString()
                    whose output is [object object]
                */
            }
        }

        this.FS_PROXY.appendFile(
            this.defaultSnapshotPath, 
            `${new Date()}` + '\n\n' + snap_shot + '\n\n', 
            'utf8'
        )
            .then()
            .catch(console.error)
    }

    /*
        StoreRecord accepts both normal and
        asynchronous functions callbacks
    */
    storeRecord(filepath, data, callback) {
        // getCurrentData() will read current data in store and
        // --send it down the chain by invoking cb with the results
        function getCurrentData(that, cb) {
            that.FS_PROXY.readFile(that.files[filepath], 'utf8')
                .then(fileContents => cb(that, JSON.parse(fileContents)))
                .catch(error => {throw error})
        }
        // appendNewRecord() will implicit invoke saveNewRecord()
        function appendNewRecord(that, recordList) {
            data.id = recordList.length + 1
            recordList.push(data)
            return saveNewRecord(that, recordList)
        }
        
        function saveNewRecord(that, record) {
            that.FS_PROXY.writeFile(that.files[filepath], JSON.stringify(record), 'utf8')
                .then(() => {
                    if (callback.constructor.name === 'AsyncFunction') {
                        callback().then()
                    }

                    else callback()
                    //that.cacheStore.emit('data', filepath, that.getPublicVersion(data))
                    that.snapShotSaver(record).then()
                })
        }

        return getCurrentData(this, appendNewRecord)
    }

    configStoreKey(filepath) {
        function verifyFileExistence(that, f_path) {
            try {
                that.FS_PROXY.readdir(that.folder)
                    .then(folderContents => {
                        if (
                            folderContents.includes(
                                retrieveBasename(that.files[f_path])
                            )
                        ) return

                        else that.registerDataPath(f_path)
                    })
                    .catch(error => {throw error})
            }

            catch (error) {
                console.error(error)
                setTimeout(process.exit, 2000, 1)
            }
        }

        return verifyFileExistence(this, filepath)
    }
}

module.exports = {Storage} 