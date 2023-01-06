class Mime {
    constructor() {
        Mime.db = [
            {ext: ['css'], type: 'text/css'},
            {ext: ['html'], type: 'text/html'},
            {ext: ['svg'], type: 'image/svg+xml'},
            {ext: ['js'], type: 'text/javascript'},
            {ext: ['json'], type: 'application/json'},
            {ext: ['ttf'], type: 'application/x-font-ttf'},
            {
                ext: ['png', 'jpg', 'jpeg', 'webp'],
                application: (ext) => `image/${ext}`
            }
        ]
        
        this.isVerifiedConfig = (config) => {
            return (
                ('ext' in config) && 
                ('type' in config || 'application' in config )
            )
        }
    
        this.defaultType = 'text/plain'
    }
    
    addType(config) {
        return this.isVerifiedConfig(config)
         ? Mime.db.push(config) 
         : false
    }

    getType(fileExt, defaultType = this.defaultType) {
        function mimeType(mime) {
            return mime
             ? (mime.type || mime.application(fileExt)) 
             : defaultType
        }

        return mimeType(
            Mime.db.filter(type => type.ext.includes(fileExt))[0]
        )
    }
}

module.exports = {Mime}