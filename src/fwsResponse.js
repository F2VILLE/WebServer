const fs = require("fs")

class fwsResponse {
    constructor(socket, fws) {
        this.socket = socket
        this.fws = fws
        this.cookies = {}
        this.locals = {}
    }

    setCookie(cookiename, value, options) {
        const cookie = `${value};`
        if (options) {
            if (options.expires) cookie += ` Expires=${options.expires};`
            if (options.maxAge) cookie += ` Max-Age=${options.maxAge};`
            if (options.domain) cookie += ` Domain=${options.domain};`
            if (options.path) cookie += ` Path=${options.path};`
            if (options.secure) cookie += ` Secure;`
            if (options.httpOnly) cookie += ` HttpOnly;`
            if (options.sameSite) cookie += ` SameSite=${options.sameSite};`
        }
        this.cookies = { ...this.cookies, [cookiename]: cookie }
    }    

    removeCookie(cookiename) {
        this.cookies = { ...this.cookies, [cookiename]: "deleted; Expires=Thu, 01 Jan 1970 00:00:00 GMT;"}
    }

    redirect(path) {
        this.socket.write("HTTP/1.1 302 Found\r\n")
        this.socket.write(`Location: ${path}\r\n`)
        this.cookies ? this.socket.write(`Set-Cookie: ${Object.keys(this.cookies).map(x => `${x}=${this.cookies[x]}`).join("; ")}\r\n`) : null
        this.socket.write("\r\n")
        this.socket.end()
    }

    render(path, locals) {
        console.log("Rendering Res", this.fws.views)
        if (!this.fws.viewEngine) return this.send(path)
        if (!fs.existsSync((this.fws.views.endsWith("/") ? this.fws.views : `${this.fws.views}/`) + (path.endsWith(`.${this.fws.viewEngineExt}`) ? path : `${path}.${this.fws.viewEngineExt}`))) return false
        const data = this.fws.viewEngine.render(fs.readFileSync((this.fws.views.endsWith("/") ? this.fws.views : `${this.fws.views}/`) + (path.endsWith(`.${this.fws.viewEngineExt}`) ? path : `${path}.${this.fws.viewEngineExt}`), "utf-8"), {...locals, ...this.locals})
        this.socket.write("HTTP/1.1 200 OK\r\n")
        this.socket.write("Content-Type: text/html\r\n")
        this.socket.write(`Content-Length: ${data.length}\r\n`)
        this.cookies ? this.socket.write(`Set-Cookie: ${Object.keys(this.cookies).map(x => `${x}=${this.cookies[x]}`).join("; ")}\r\n`) : null
        this.socket.write("\r\n")
        this.socket.write(data)
        this.socket.end()
    }

    sendText(data) {
        this.socket.write("HTTP/1.1 200 OK\r\n")
        this.socket.write("Content-Type: text/html\r\n")
        this.socket.write(`Content-Length: ${data.length}\r\n`)
        this.cookies ? this.socket.write(`Set-Cookie: ${Object.keys(this.cookies).map(x => `${x}=${this.cookies[x]}`).join("; ")}\r\n`) : null
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
        this.cookies ? this.socket.write(`Set-Cookie: ${Object.keys(this.cookies).map(x => `${x}=${this.cookies[x]}`).join("; ")}\r\n`) : null
        this.socket.write("\r\n")
        this.socket.write(data)
        this.socket.end()
    }

    send(htmlFileName) {
        const data = fs.readFileSync((this.fws.views.endsWith("/") ? this.fws.views : `${this.fws.views}/`) + (htmlFileName.endsWith(".html") ? htmlFileName : `${htmlFileName}.html`), 'utf8')
        this.socket.write("HTTP/1.1 200 OK\r\n")
        this.socket.write("Content-Type: text/html\r\n")
        this.socket.write(`Content-Length: ${data.length}\r\n`)
        this.cookies ? this.socket.write(`Set-Cookie: ${Object.keys(this.cookies).map(x => `${x}=${this.cookies[x]}`).join("; ")}\r\n`) : null
        this.socket.write("\r\n")
        this.socket.write(data)
        this.socket.end()
    }

}

module.exports = fwsResponse