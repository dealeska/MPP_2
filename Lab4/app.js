const express = require("express")
const bcrypt = require('bcrypt')
const http = require("http")
const multer = require("multer")
const cookieParser = require('cookie-parser')
const cookies = require('cookie-parse')
const jwt = require('jsonwebtoken')
const io = require("socket.io")({
    serveClient: true,
    cookie: true
})
const fs = require('fs');
const moment = require('moment')
const Task = require('./task')

function readToJSON(path, isAll) {
    let data = fs.readFileSync(path, "utf8")
    let parsedJSON = JSON.parse(data)
    let p = [[]]
    if (path == 'data.json' && !isAll) {
        for (let i = 0; i < parsedJSON[0].length; i++) {
            if (parsedJSON[0][i].userId == userId) {
                p[0].push(parsedJSON[0][i])
            }
        }
        console.log(JSON.parse(JSON.stringify(Object.assign({}, p))))
        console.log(parsedJSON)
        return JSON.parse(JSON.stringify(Object.assign({}, p)))

    }
    return parsedJSON
}

function writeToJSON(path, obj) {
    const data = JSON.stringify(obj, null, 2)
    fs.writeFileSync(path, data)
    return data
}

const dataPath = 'data.json'
const idPath = 'id.json'
const usersPath = 'users.json'
const tokenKey = 'b91028378997c0b3581821456edefd0ec'

let userId = -1
let lastUploadFile

const jsonParser = express.json()
const app = express()
const server = http.createServer(app)

app.use(express.static(__dirname + "/views/public"))

const storageConfig = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads");
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

app.use(express.static(__dirname))
app.use(multer({ storage: storageConfig }).single("task-files"));

app.use(cookieParser())

app.use(async (req, res, next) => {
    console.log(req.cookies)
    try {
        let decoded = jwt.verify(req.cookies.token, tokenKey)
        let users = readToJSON(usersPath, false)
        let user = users.find(u => u.login === decoded.login)
        req.logged = user !== undefined && await bcrypt.compare(decoded.password, user.hashedPassword)
        userId = user.id
    } catch {
        req.logged = false
    }
    next();
})

io.use(async function (socket, next) {
    let token
    try {
        token = cookies.parse(socket.handshake.headers.cookie).token
    } catch {
        token = undefined
    }

    console.log("token ", token)
    let logged
    try {
        let decoded = jwt.verify(token, tokenKey)
        let users = readToJSON(usersPath, false)
        let user = users.find(u => u.login === decoded.login)
        logged = user !== undefined && await bcrypt.compare(decoded.password, user.hashedPassword)
        userId = user.id
    } catch {
        logged = false
    }
    if (logged) {
        next()
    } else {
        next(new Error('Authentication error'))
    }
})

io.on('connection', function (socket) {
    console.log("connected")

    socket.on("askTasks", () => onReadTasks(io))

    socket.on("createTask", (data) => {
        onCreateTask(data, lastUploadFile)
        onReadTasks(io) //false
    })

    socket.on("completeTask", (taskId, data) => {
        onUpdateCompleted(taskId, data)
        onReadTasks(io)
    })

    socket.on("deleteTask", (taskId) => {
        onDeleteTask(taskId)
        onReadTasks(io)
    })
})

app.get("/download/:taskId/:filename", function (req, res) {
    console.log(req.logged)
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }
    onDownload(req, res)
})

app.post("/signIn", jsonParser, function (req, res) {
    console.log("app.post('/signIn'...)")
    onSignIn(req, res);
})

app.post("/signUp", jsonParser, function (req, res) {
    onSignUp(req, res);
})

app.post("/upload", function (req, res, next) {
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }
    console.log(req.file)
    lastUploadFile = req.file
    next()
})

function onReadTasks (io) {
    io.sockets.emit("getTasks", JSON.stringify(readToJSON(dataPath, false)))
}

function onCreateTask(newTaskData, lastFile) {
    let ids = readToJSON(idPath)
    let data = readToJSON(dataPath, true)    

    ids.taskId = ids.taskId + 1
    ids.userId = ids.userId;
    if (newTaskData.name === "") {
        newTaskData.name = `New task-${ids.taskId}`
    }
    if (newTaskData.expires === "") {
        newTaskData.expires = moment(new Date()).add(1, 'days').format('YYYY-MM-DDThh:mm')
    }
    if (newTaskData.name === "") {
        newTaskData.name = `New task-${data.taskId}`
    }

    if (newTaskData.description === "") {
        newTaskData.description = `No description:(`
    }
    
    //if userId == undefined
    const task = new Task(ids.taskId, userId, newTaskData.name, newTaskData.expires, newTaskData.description, lastUploadFile)
    data[0].push(task)

    writeToJSON(idPath, ids)
    writeToJSON(dataPath, data)
}

function onUpdateCompleted (taskId) {
    let data = readToJSON(dataPath, true)
 
    const index = data[0].findIndex(x => x.id == parseInt(taskId))
    data[0][index].isComplete = true

    writeToJSON(dataPath, data)
}

function onDeleteTask (taskId) {
    let data = readToJSON(dataPath, true)

    data[0] = data[0].filter(x => x.id !== parseInt(taskId))
    writeToJSON(dataPath, data)
}

function onDownload (req, res) {
    let path = process.cwd() + "\\uploads\\" + req.params.filename
    let taskId = req.params.taskId
    let data = readToJSON(dataPath)
    let originalName = data[0].filter(x => x.id === parseInt(taskId))[0].file.originalname

    res.download(path, originalName)
}

async function onSignIn (req, res) {
    console.log("function onSignIn(req, res)")
    let users = readToJSON(usersPath, false)
    let user = users.find(u => u.login === req.body.login)
    if (user !== undefined) {
        const match = await bcrypt.compare(req.body.password, user.hashedPassword)
        if (match) {
            userId = user.id
            let token = jwt.sign(req.body, tokenKey, { expiresIn: 600 })
            res.cookie('token', token, { httpOnly: true })
            res.send(readToJSON(dataPath, false))
        }
        else {
            res.status(401).json({ message: 'Bad password' })
        }
    } else {
        res.status(401).json({ message: 'Not authorized' })
    }
}

function onSignUp (req, res) {
    console.log(req.body)
    let users = readToJSON(usersPath, false)
    let user = users.find(u => u.login === req.body.login)
    if (user === undefined) {
        let ids = readToJSON(idPath)

        ids.userId = userId = ids.userId + 1;
        writeToJSON(idPath, ids)
        users.push({ id: ids.userId, login: req.body.login, hashedPassword: req.body.password })
        let token = jwt.sign(req.body, tokenKey, { expiresIn: 600 })
        res.cookie('token', token, { httpOnly: true })
        writeToJSON(usersPath, users)
    } else {
        res.status(401).json({ message: 'Not authorized' })
    }
}

io.attach(server)
server.listen(3000)
