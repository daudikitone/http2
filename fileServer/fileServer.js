/*  Local Modules   */
const {readdir} = require('node:fs').promises
const {createReadStream} = require('node:fs')
const gzip = require('node:zlib').createGzip()
const filePattern = /[^]*?[.](\w+?)$/

/*  Dependency Modules  */
const {Mime} = require('./mime.js')

class FileServer {
    constructor(config) {
        if (!config.folder) {
            throw new Error('FileServer instantiated without a root folder')
        }

        if (config.serverDriver && !(['http', 'http2'].includes(config.serverDriver))) {
            throw new Error(`FileServer do not support ${config.serverDriver}`)
        }
        
        if (config.serverDriver || !config.serverDriver) {
            config.serverDriver = config.serverDriver || 'http2'
            this.sendHeaders = (status, stream, headers) => {
                switch (status) {
                    case (404 || 500): 
                        config.serverDriver === 'http'
                         ? stream.setHeader('status', status) 
                         : stream.respond({':status': status})
                        break
                    
                    default: 
                        config.serverDriver === 'http2'
                         ? stream.respond(Object.assign(headers, {':status': status})) 
                         : stream.writeHead(status, headers) 
                }
            }
        }

        FileServer.files = []
        FileServer.mime = new Mime()

        FileServer.originFolder = config.folder
        FileServer.registerFilepath = function(filepath) {
            Array.isArray(filepath)
             ? FileServer.files = FileServer.files.concat(
                filepath.map(p => configPath(p))) 
             : FileServer.files.push(configPath(filepath))

            function configPath(f_path) {
                return {
                    url: ((path) => {
                        path = path.replace(FileServer.originFolder, '')
                        !(path[0] === '/') && (path = `/${path}`)
                        !(path.search('index.html') === -1) && (path = '/') 
                        return path
                    })(f_path), 
                    filepath: f_path
                }
            }
        }

        registerFilesToServe(config.folder)
        
        function registerFilesToServe(folderPath) {
            let pathStack = []

            return dirReader(folderPath, readFolderContents)

            function dirReader(dir_path, cb) {
                readdir(dir_path)
                    .then(dir_list => cb(dir_path, dir_list))
                    .catch(e => { throw e })
            }

            function readPathStack(cb) {
                if (pathStack.length > 0) {
                    return dirReader(pathStack.pop(), cb)
                }
            }

            function readFolderContents(folderAddress, folderContents) {
                if (folderContents.length <= 0) {
                    readPathStack(readFolderContents)
                }

                else {
                    const dirContents = separateFilesAndFolders(folderAddress, folderContents)
                    
                    if (dirContents.files) {
                        FileServer.registerFilepath(dirContents.files)
                    }

                    if (dirContents.folders) {
                        pathStack = pathStack.concat(dirContents.folders)
                    }

                    readPathStack(readFolderContents)
                }

                function separateFilesAndFolders(dir_path, dir_list) {
                    const files = [], folders = []
                    dir_path = (dir_path[dir_path.length - 1] === '/') ? dir_path : `${dir_path}/`

                    dir_list.forEach(listItem => {
                        if (filePattern.test(listItem)) files.push(`${dir_path}${listItem}`)
                        else folders.push(`${dir_path}${listItem}`)
                    })

                    return {
                        files: files.length > 0 ? files : null, 
                        folders: folders.length > 0 ? folders : null
                    }
                }
            }
        }
    }

    read(filepath, dest) {
        createReadStream(filepath).pipe(dest)
    }

    getFileExt(filepath) {
        return ((ext) => ext ? ext[1] : undefined)(filePattern.exec(filepath))
    }

    serveFile(filepath, stream) {
        fileReader(
            FileServer.files.filter(
                file => file.url === filepath
            )[0], 
            this.getFileExt
        )
        
        function fileReader(file, getFileExt) {
            if (file) {
                stream.respond({
                    ':status': 200,
                    'content-type': `${FileServer.mime.getType(getFileExt(file.filepath))}; charset=utf-8`,
                    //'content-encoding': 'gzip',
                    'access-control-allow-origin': '*'
                })
                createReadStream(file.filepath).pipe(stream)
            }

            else {
                stream.respond({
                    ':status': 404,
                    'content-type': 'text/plain; charset=utf-8',
                    'access-control-allow-origin': '*'
                })
                stream.end('Not Found')
            }
        }
    }

    saveImageFile(file) {
        return this
    }
}

module.exports = {FileServer}