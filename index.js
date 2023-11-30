const net = require("net")
const fs = require("fs")

class Router {
    ACCEPTED_METHODS = ["get", "post"]
    constructor() {
        this.routes = {
            "get": [],
            "post": [],
            "*": []
        }
    }

    /**
     * 
     * @param {str} path 
     * @param {{req: Object, res: Request}} callback 
     */
    get(path, callback) {
        this.routes.get.push({ path, callback })
    }

    /**
     * 
     * @param {str} path 
     * @param {{req: Object, res: Request}} callback 
     */
    post(path, callback) {
        this.routes.post.push({ path, callback })
    }

    /**
     * 
     * @param {str} path 
     * @param {{req: Object, res: Request}} callback 
     */
    use(path, callback) {
        this.routes["*"].push({ path, callback })
    }
}

class Response {
    constructor(socket, fws) {
        this.socket = socket
        this.fws = fws
    }

    render(path, locals) {
        if (!this.fws.viewEngine) return this.send(path)
        if (!fs.existsSync((this.fws.views.endsWith("/") ? this.fws.views : `${this.fws.views}/`) + (path.endsWith(`.${this.fws.viewEngineExt}`) ? path : `${path}.${this.fws.viewEngineExt}`))) return false
        const data = this.fws.viewEngine.render(fs.readFileSync((this.fws.views.endsWith("/") ? this.fws.views : `${this.fws.views}/`) + (path.endsWith(`.${this.fws.viewEngineExt}`) ? path : `${path}.${this.fws.viewEngineExt}`), "utf-8"), locals)
        this.socket.write("HTTP/1.1 200 OK\r\n")
        this.socket.write("Content-Type: text/html\r\n")
        this.socket.write(`Content-Length: ${data.length}\r\n`)
        this.socket.write("\r\n")
        this.socket.write(data)
        this.socket.end()
    }

    sendText(data) {
        this.socket.write("HTTP/1.1 200 OK\r\n")
        this.socket.write("Content-Type: text/html\r\n")
        this.socket.write(`Content-Length: ${data.length}\r\n`)
        this.socket.write("\r\n")
        this.socket.write(data)
        this.socket.end()
    }

    #getContentTypeAndEncoding(path) {
        const ext = path.split(".").pop()?.toLowerCase()
        const contentTypes = {
            "css": { encoding: "utf8", contentType: "text/css" },
            "js": { encoding: "utf8", contentType: "text/javascript" },
            "html": { encoding: "utf8", contentType: "text/html" },
            "png": { encoding: "binary", contentType: "image/png" },
            "jpg": { encoding: "binary", contentType: "image/jpeg" },
            "jpeg": { encoding: "binary", contentType: "image/jpeg" },
            "gif": { encoding: "binary", contentType: "image/gif" },
            "svg": { encoding: "binary", contentType: "image/svg+xml" },
            "ico": { encoding: "binary", contentType: "image/x-icon" },
            "json": { encoding: "utf8", contentType: "application/json" },
            "pdf": { encoding: "binary", contentType: "application/pdf" },
            "zip": { encoding: "binary", contentType: "application/zip" },
            "tar": { encoding: "binary", contentType: "application/x-tar" },
            "xml": { encoding: "binary", contentType: "application/xml" },
            "ogg": { encoding: "binary", contentType: "application/ogg" },
            "mp4": { encoding: "binary", contentType: "video/mp4" },
            "mp3": { encoding: "binary", contentType: "audio/mpeg" },
            "wav": { encoding: "binary", contentType: "audio/wav" },
            "webm": { encoding: "binary", contentType: "audio/webm" },
            "weba": { encoding: "binary", contentType: "audio/weba" },
            "webp": { encoding: "binary", contentType: "image/webp" },
            "woff": { encoding: "binary", contentType: "font/woff" },
            "woff2": { encoding: "binary", contentType: "font/woff2" },
            "ttf": { encoding: "binary", contentType: "font/ttf" },
            "otf": { encoding: "binary", contentType: "font/otf" },
            "txt": { encoding: "utf8", contentType: "text/plain" }
        }

        return contentTypes[ext] || contentTypes["txt"]
    }

    sendFile(path) {
        if (!fs.existsSync(path)) return false
        const contentTypeAndEncoding = this.#getContentTypeAndEncoding(path)
        const encoding = contentTypeAndEncoding.contentType.startsWith('text/') ? contentTypeAndEncoding.encoding : null;
        const data = fs.readFileSync(path, encoding)
        this.socket.write("HTTP/1.1 200 OK\r\n")
        this.socket.write(`Content-Type: ${contentTypeAndEncoding.contentType}\r\n`)
        this.socket.write(`Content-Length: ${data.length}\r\n`)
        this.socket.write("\r\n")
        this.socket.write(data)
        this.socket.end()
    }

    send(htmlFileName) {
        const data = fs.readFileSync((this.fws.views.endsWith("/") ? this.fws.views : `${this.fws.views}/`) + (htmlFileName.endsWith(".html") ? htmlFileName : `${htmlFileName}.html`), 'utf8')
        this.socket.write("HTTP/1.1 200 OK\r\n")
        this.socket.write("Content-Type: text/html\r\n")
        this.socket.write(`Content-Length: ${data.length}\r\n`)
        this.socket.write("\r\n")
        this.socket.write(data)
        this.socket.end()
    }

}

class fws {
    #SETTINGS_ALLOWED = ["views", "viewEngine"]
    constructor(options) {
        this.ssrv = net.createServer({ allowHalfOpen: true, keepAlive: false })
        this.router = new Router()
        this.views = __dirname + "/views"
        this.verbose = (options?.verbose ?? false)
        this.viewEngine = null
        this.renderEngineModule = null
        this.viewEngineExt = null
        this.ssrv.on("connection", (socket) => {
            socket.on("data", (d) => {
                const headers = this.#parseHeader(d.toString())
                const req = {
                    path: headers.path,
                    headers: headers,
                    remoteAddress: socket.remoteAddress
                }
                const method = req.headers.method.toLowerCase()
                if (this.verbose) console.log(`[LOG] ${method.toUpperCase()} request on ${req.headers.path}`)
                if (this.router.ACCEPTED_METHODS.includes(method)) {
                    const route = this.router.routes[method].find(r => r.path == req.headers.path) || this.router.routes["*"].find(r => r.path == req.path)
                    if (route) {
                        const res = new Response(socket, this)
                        route.callback(req, res)
                    } else {
                        socket.write("HTTP/1.1 404 Not Found\r\n\r\n")
                        socket.end()
                    }
                }
            })
        })
    }

    renderEngineSetup(engine) {
        if (!this.renderEngineModule) {
            if (engine == "pug") {
                this.renderEngineModule = require("pug")
                this.viewEngineExt = "pug"
                this.viewEngine = {
                    name: "pug",
                    render: (string, data) => {
                        const renderer = this.renderEngineModule.compile(string)
                        return renderer(data)
                    }
                }
            }
        }
    }

    set(setting, value) {
        if (this.#SETTINGS_ALLOWED.includes(setting)) {
            this[setting] = value
            if (setting == "viewEngine") this.renderEngineSetup(value)
        }
    }

    #readdirsAndServerFiles(folderPath, originalFolderPath) {
        const files = fs.readdirSync(folderPath)
        for (const file of files) {
            if (fs.statSync(`${folderPath}/${file}`).isDirectory()) {
                this.#readdirsAndServerFiles(`${folderPath}/${file}`, originalFolderPath)
            } else {
                if (this.verbose) console.log(`[LOG] Defining public route ${`${folderPath}/${file}`.replace(originalFolderPath, "")} for file ${folderPath + "/" + file}`)
                this.router.use(`${folderPath}/${file}`.replace(originalFolderPath, ""), (req, res) => {
                    res.sendFile(`${folderPath}/${file}`)
                })
            }
        }
    }

    public(folderPath) {
        this.#readdirsAndServerFiles(folderPath, folderPath)
    }

    #parseHeader(rawHeaders) {
        const req = {}
        const method = (/.*(?= \/)/).exec(rawHeaders)?.shift().trim()
        if (!method) return null
        req.method = method
        req.path = (new RegExp(`(?<=${req.method} )\/(.*)?(?= )`)).exec(rawHeaders)?.shift().trim()
        req.version = (new RegExp(`(?<=${req.method} \/(\\w+)? ).*(?=\r\n)`)).exec(rawHeaders)?.shift().trim()
        for (const line of rawHeaders.split("\r\n").slice(1)) {
            const splittedLine = line.split(":")
            if (splittedLine.length > 1) {
                req[line.split(':')[0].split("").map((v, i) => i == 0 ? v.toLowerCase() : v).join("")] = splittedLine.slice(1)
            }
        }
        return req
    }

    async listen(port) {
        return new Promise((resolve, reject) => {
            this.ssrv.listen(port, () => {
                resolve()
            })
        })
    }
}


module.exports = (options) => {
    return new fws(options)
}