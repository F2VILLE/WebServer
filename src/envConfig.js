const fs = require("fs")

if (fs.existsSync(process.cwd() + "/.env")) {
    const envFile = fs.readFileSync(process.cwd() + "/.env", "utf-8")
    const envLines = envFile.split("\n")
    for (const line of envLines) {
        if (line.startsWith("#")) continue
        const [key, value] = line.split("=")
        process.env[key] = value.startsWith("\"") ? value.slice(1, value.length - 1) : value
    }
}