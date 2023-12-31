const net = require("net")
const fs = require("fs")

const fwsResponse = require("./src/fwsResponse")
const fwsRequest = require("./src/fwsRequest")
const Router = require("./src/Router")
const Session = require("./src/Session")
const crypto = require("crypto")

function generateSessionID() {
    return crypto.randomBytes(32).toString("hex")
}


class fws {
    #SETTINGS_ALLOWED = ["views", "viewEngine"]
    constructor(options) {
        if (options.dotenv) {
            require("./src/envConfig.js")
        }
        this.ssrv = net.createServer({ allowHalfOpen: true, keepAlive: false })
        this.router = new Router(this)
        this.views = __dirname + "/views"
        this.verbose = (options?.verbose ?? false)
        this.viewEngine = null
        this.renderEngineModule = null
        this.viewEngineExt = null
        this.sessions = []
        this.ssrv.on("connection", (socket) => {
            socket.on("data", (d) => {
                const req = new fwsRequest(d.toString(), socket.remoteAddress)
                const method = req.headers.method.toLowerCase()
                if (this.verbose) console.log(`[LOG] ${method.toUpperCase()} request on ${req.headers.path}`)
                if (this.router.ACCEPTED_METHODS.includes(method)) {
                    const route = this.router.routes[method].find(r => r.path == req.headers.path) || this.router.routes["*"].find(r => r.path == req.path)
                    if (route) {
                        const res = new fwsResponse(socket, this, req)
                        if (!req.cookies.sid || !this.sessions.find(s => s.id == req.cookies.sid)) {
                            const sid = req.cookies.sid ?? generateSessionID()
                            this.sessions.push(new Session(sid))
                            res.setCookie("sid", sid)
                            res.session = this.sessions.find(s => s.id == sid)
                        }
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