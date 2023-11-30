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

module.exports = Router