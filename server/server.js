class Router {
    constructor() {
        this.activeRoutes = []
        this.disabledRoutes = []

        assignRouteMethods(this.activeRoutes, this.disabledRoutes)
        
        function assignRouteMethods() {
            for (const i in arguments) {
                arguments[i][getIndex.name] = getIndex
            }

            function getIndex(config) {
                return !config
                 ? findIndex(this, value => !value.method && !value.path) 
                 : findIndex(this, 
                    value => value.method === config.method
                     && value.path === config.path)
                
                function findIndex(values, predicate) {
                    for (const i in values) {
                        if (predicate(values[i])) return i
                        else continue 
                    }
                    return -1
                }
            }
        }
    }

    disabledRouteHandler(cb) {
        cb().then().catch(console.error)
    }

    async findRoute(method, path) {
        method = method.toLowerCase()

        function getRoute(activeRoute, disabledRoute) {
            return {activeRoute, disabledRoute}
        }

        function predicate(r) {
            return r.method === method && r.path === path
        }

        return getRoute(
            this.activeRoutes.filter(predicate)[0], 
            this.disabledRoutes.filter(predicate)[0]
        )
    }

    route(method, path, application) {
        function configuredRoute(activeRoutes, disabledRoutes) {
            const route = {
                method: method.toLowerCase(), 
                path, 
                application
            }

            Object.defineProperties(route, {
                'activeRoutes': {
                    writable: false,
                    value: activeRoutes
                },
                'disabledRoutes': {
                    writable: false,
                    value: disabledRoutes
                }, 
                'attachRoute': {
                    writable: false,
                    enumerable: false,
                    value: function() {
                        return routeSwitch(this).attach()
                    }
                }, 
                'detachRoute': {
                    writable: false,
                    enumerable: false,
                    value: function() {
                        return routeSwitch(this).detach()
                    }
                }
            })

            function routeSwitch(that) {
                return {
                    attach() {
                        const index = that.disabledRoutes.getIndex({
                            method: that.method,
                            path: that.path
                        })
                        if (index === -1) return

                        const undefinedIndex = that.activeRoutes.getIndex()
                        
                        return !(undefinedIndex === -1)
                         && (that.activeRoutes[undefinedIndex] = that.disabledRoutes[index]) 
                         && (that.disabledRoutes[index] = {}) 
                         && console.log(`Route attached: method [${that.method}] path [${that.path}]`) 
                         && true
                    }, 

                    detach() {
                        const index = that.activeRoutes.getIndex({
                            method: that.method,
                            path: that.path
                        })
                        if (index === -1) return

                        const undefinedIndex = that.disabledRoutes.getIndex()

                        !(undefinedIndex === -1)
                         ? that.disabledRoutes.push(that.activeRoutes[index]) 
                         : (that.disabledRoutes[undefinedIndex] = that.activeRoutes[index])

                        return that.activeRoutes[index]
                         && (that.activeRoutes[index] = {}) 
                         && console.log(`Route detached: method [${that.method}] path [${that.path}]`) 
                         && true
                    }
                }
            }

            return route
        }
    
        this.activeRoutes.push(configuredRoute(this.activeRoutes, this.disabledRoutes))
    }
}

class Server extends Router {
    constructor(http2, config, extentions) {
        super()
        const that  = this

        // Features enhancement
        this.fileServer = extentions.fileServer
        this.dataStore = extentions.dataStore

        // Server configuration
        this.server = http2.createSecureServer(config)
        this.port = process.env.PORT
        this.isListening = false

        this.errorHandler = function(error) {
            console.error(error)
            setTimeout(process.exit, 2000, 1)
        }

        this.handleDisabledRoute = function(stream) {
            stream.respond({
                ':status': 417,
                'content-type': 'text/plain; charset=utf-8',
                'access-control-allow-origin': '*'
            })
            stream.end('Service temporarily down')
        }
        
        this.dispatchStream = async function(stream, headers) {
            const route = await this.findRoute(headers[':method'], headers[':path'])
            
            route.activeRoute &&
             await route.activeRoute.application(stream, headers, this.dataStore);

            route.disabledRoute &&
             this.disabledRouteHandler(async () => that.handleDisabledRoute(stream));
            
            (!route.activeRoute && !route.disabledRoute) &&
             this.fileServer.serveFile(headers[':path'], stream);
        }

        this.server.on('error', e => that.errorHandler(e))
        this.server.on('stream', (stream, headers) => {
            that.dispatchStream(stream, headers)
                .then()
                .catch(e => that.errorHandler(e))
        })
    }

    bindPort(port) {
        !this.port && (this.port = port)
        return this 
    }

    farewellOnError(cb = undefined) {
        function exitOnExecption(that, callback) {
            process.on('uncaughtException', error => {
                try {
                    if (callback) {
                        (callback.constructor.name === 'AsyncFunction')
                         ? callback(error).then().catch(e => {throw e}) 
                         : callback(error)
                    }
                
                    else that.errorHandler(error)
                }
            
                catch (e) {
                    console.log('Failed to execute callback on farewell')
                    that.errorHandler(e)
                }
            })

            return that
        }

        return exitOnExecption(this, cb)
    }

    listen(cb = undefined, config = {}) {
        if (!this.isListening && this.port) {
            this.server.listen(this.port)
            this.isListening = true
            cb ? cb() : console.log(`Server listens on port ${this.port}`);
            (config.flashWarnings || config.flashWarnings === undefined)
             && process.on('warning', e => console.warn('[WARNING]', e.stack))
        }

        if (!this.isListening && !this.port) {
            console.log(`Bind port to Server`)
            process.exit(1)
        }
    }
}

module.exports = {Server}