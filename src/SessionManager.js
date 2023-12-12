class SessionManager {
    constructor() {
        this.sessions = new Map()
    }

    /**
     * 
     * @param {string} sessionID 
     * @returns 
     */
    getSession(sessionID) {
        return this.sessions.get(sessionID)
    }
    
    setSession(sessionID, data) {
        this.sessions.set(sessionID, data)
    }

    // view accessor (get & set)
}

module.exports = SessionManager