class Session {
    constructor(id) {
        this.id = id
        this.map = new Map()
        this.lastUpdate = new Date()
    }

    set(key, value) {
        this.lastUpdate = new Date()
        this.map.set(key, value)
    }

    get(key) {
        this.lastUpdate = new Date()
        return this.map.get(key)
    }
}

module.exports = Session