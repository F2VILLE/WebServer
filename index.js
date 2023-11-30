const net = require("net")
const fs = require("fs")

const Response = require("./src/Response")
const Router = require("./src/Router")

class fws {
    #SETTINGS_ALLOWED = ["views", "viewEngine"]
    constructor(options) {
        this.ssrv = net.createServer({ allowHalfOpen: true, keepAlive: false })
        this.router = new Router(this)
        this.views = __dirname + "/views"
        this.verbose = (options?.verbose ?? false)
        this.viewEngine = null
        this.renderEngineModule = null
        this.viewEngineExt = null
        this.ssrv.on("connection", (socket) => {
            socket.on("data", (d) => {
                const req = this.#parseHeader(d.toString())
                req.remoteAddress = socket.remoteAddress
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
                this.router.use(`${folderPath}/${file}`.replace(originalFolderPath, ""), (req, res) => {
                    res.sendFile(`${folderPath}/${file}`)
                })
            }
        }
    }

    public(folderPath) {
        this.#readdirsAndServerFiles(folderPath, folderPath)
    }

    /**
     * 
     * @param {string} rawHeaders 
     * @returns 
     */
    #parseHeader(rawHeaders) {
        const headers = {}
        const method = (/.*(?= \/)/).exec(rawHeaders)?.shift().trim()
        if (!method) return null
        headers.method = method
        headers.path = (new RegExp(`(?<=${headers.method} )\/(.*)?(?= )`)).exec(rawHeaders)?.shift().trim()
        headers.version = (new RegExp(`(?<=${headers.method} \/(\\w+)? ).*(?=\r\n)`)).exec(rawHeaders)?.shift().trim()
        const postContent = {}
        if (method.toLowerCase() == "post") {
            if (rawHeaders.indexOf("Content-Type" != -1)) {
                headers["content-type"] = (new RegExp(`(?<=Content-Type: )([^(;|\n| )])*`)).exec(rawHeaders)?.shift().trim()
                if (headers["content-type"] == "multipart/form-data") {
                    postContent.boundary = (new RegExp(`(?<=boundary=).*(?=\r\n)`)).exec(rawHeaders)?.shift().trim()
                    postContent.contentLength = (new RegExp(`(?<=Content-Length: ).*(?=\r\n)`)).exec(rawHeaders)?.shift().trim()
                    postContent.postfields = rawHeaders.split("\r\n\r\n").slice(1).join("\r\n\r\n").split(`--${postContent.boundary}`).filter(x => (/(?<=name=").*?(?=")/).test(x) || (/(?<=filename=").*?(?=")/).test(x)).map(x => {
                        const objectField = {}
                        const splitted = x.split("\r\n\r\n")
                        const name = (new RegExp(`(?<=name=").*?(?=")`)).exec(splitted[0])?.shift().trim()
                        const filename = (new RegExp(`(?<=filename=").*?(?=")`)).exec(splitted[0])?.shift().trim()
                        if (!name && !filename) return null
                        const contentType = (new RegExp(`(?<=Content-Type: ).*(?=\r\n)`)).exec(splitted[0])?.shift().trim()
                        const content = splitted[1]?.slice(0, splitted[1].length - 2)
                        name ? objectField.name = name : null
                        filename ? objectField.filename = filename : null
                        contentType ? objectField.contentType = contentType : null
                        objectField.content = content ?? undefined 
                        return objectField
                    })
                }
                else if (headers["content-type"] == "application/x-www-form-urlencoded") {
                    postContent.postfields = rawHeaders.split("\r\n").pop().split("&").map(x => x.split("=")).map(x => ({ name: x[0], content: x[1] }))
                }
                else if (headers["content-type"] == "application/json") {
                    try {
                        postContent.postfields = JSON.parse(rawHeaders.split("\r\n\r\n").pop())
                    } catch (error) {
                        postContent.postfields = null
                    }
                }
                const rawContent = rawHeaders.slice(rawHeaders.indexOf("Content-Type"), rawHeaders.length)
                rawHeaders = rawHeaders.slice(0, rawHeaders.indexOf("Content-Type"))
            }
        }
        for (const line of rawHeaders.split("\r\n").slice(1)) {
            const splittedLine = line.split(":")
            if (splittedLine.length > 1) {
                headers[line.split(':')[0].split("").map((v, i) => i == 0 ? v.toLowerCase() : v).join("")] = splittedLine.slice(1).join("")
            }
        }
        const req = {
            path: headers.path,
            headers: headers,
        }

        postContent.postfields ? req.body = (headers["content-type"] != "application/json" ? postContent.postfields.reduce((a, v) => ({ ...a, [v.name]: v.content}), {}) : postContent.postfields) : null
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