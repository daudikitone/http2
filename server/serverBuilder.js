// Node Modules
const {readFileSync} = require('node:fs')

// Local Modules
const {Server} = require('./server.js')
const {FileServer} = require('../fileServer/fileServer.js')
const {dataStore} = require('../dataStore/storeBuilder.js')

module.exports = {
    server: new Server(
        require('node:http2'), 
        {
            key: readFileSync('localhost-privkey.pem'), 
            cert: readFileSync('localhost-cert.pem')
        }, 
        {
            dataStore,
            fileServer: new FileServer({folder: './client'})
        }
    )
}
