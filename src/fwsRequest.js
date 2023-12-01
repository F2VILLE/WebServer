
class fwsRequest {
    #rawHeaders = ""
    constructor(rawHeaders, remoteAddress) {
        this.#rawHeaders = rawHeaders
        this.remoteAddress = (remoteAddress ?? null)
        this.path = null
        this.body = null
        this.cookies = {}
        this.#parseHeader()
    }

/**
 * 
 * @param {string} rawHeaders 
 * @returns 
 */
    #parseHeader() {
        let rawHeaders = this.#rawHeaders
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
        this.cookies = headers.cookie ? headers.cookie.split(";").map(x => x.split("=")).map(x => ({ name: x[0], value: x[1] })).reduce((a, v) => ({ ...a, [v.name.trim()]: v.value }), {}) : {}
        this.path = headers.path
        this.headers = headers

        postContent.postfields ? this.body = (headers["content-type"] != "application/json" ? postContent.postfields.reduce((a, v) => ({ ...a, [v.name]: v.content }), {}) : postContent.postfields) : null
    }

}

module.exports = fwsRequest