# F2Ville's WebServer

This is a WebServer made in JavaScript using the native NodeJS modules "net".
Heavily inspired by ExpressJS.

/!\\ DO NOT USE IN PRODUCTION. THIS IS A POC TO LEARN ABOUT NET /!\\

## How to use

Example :

```js
const fws = require('./src'),
    app = fws({verbose: true}), // Init the app, verbose enable logging in console
    port = 80
    
const router = app.router; // Get the router

app.set("views", __dirname + "/views") // Set the views directory
app.set("viewEngine", "pug") // Set the view engine
app.public("./public") // Set the public directory, this will serve every file in the specified directory

router.get("/", (req,res) => {
    console.log("IP Address :", req.remoteAddress) // Print the remote address in console
    res.render("index", {ip: req.remoteAddress}) // Render the index.pug file in the views directory
})

router.get("/test", (req,res) => {
    res.render("test") // Render the test.pug file in the views directory
})

app.listen(port).then(() => { // "Start" the server by binding to a port. return a Promise
    console.log("Listening on port " + port)
})

```