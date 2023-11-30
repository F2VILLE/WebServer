const fwsRequest = require("./fwsRequest.js")
const fwsResponse = require("./fwsResponse.js")

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
     * Callback for methods.
     *
     * @callback routerCallback
     * @param {fwsRequest} req
     * @param {fwsResponse} res
     */

    /**
     * @function get
     * @param {str} path 
     * @param {routerCallback} callback 
     */
    get(path, callback) {
        this.routes.get.push({ path, callback })
    }

    /**
     * @function post
     * @param {str} path 
     * @param {routerCallback} callback 
     */
    post(path, callback) {
        this.routes.post.push({ path, callback })
    }

    /**
     * @function use
     * @param {str} path 
     * @param {routerCallback} callback 
     */
    use(path, callback) {
        this.routes["*"].push({ path, callback })
    }
}

module.exports = Router