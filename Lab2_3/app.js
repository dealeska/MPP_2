const express = require('express')
const multer = require("multer")
const cookieParser = require('cookie-parser')
const moment = require('moment')
const Task = require('./task')
const fs = require('fs')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { parse } = require('path')

const dataPath = 'data.json'
const idPath = 'id.json'
const usersPath = 'users.json'
const tokenKey = 'b91028378997c0b3581821456edefd0ec'

let userId = -1
let lastUploadFile

const jsonParser = express.json()
const app = express()
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
        let users = readToJSON(usersPath)
        let user = users.find(u => u.login === decoded.login)
        req.logged = user !== undefined && await bcrypt.compare(decoded.password, user.hashedPassword)
        userId = user.id
    } catch {
        req.logged = false
    }
    next();
})

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

app.get("/tasks", function (req, res) {
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }
    console.log(req.url)
    res.send(readToJSON(dataPath, false))
})

app.get("/download/:taskId/:filename", function (req, res) {
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }
    let path = process.cwd() + "\\uploads\\" + req.params.filename
    let taskId = req.params.taskId
    let data = readToJSON(dataPath, false)
    let originalName = data[0].filter(x => x.id === parseInt(taskId))[0].file.originalname

    res.download(path, originalName)
})

app.post("/signIn", jsonParser, async function (req, res) {
    console.log(req.body)
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
})

app.post("/signUp", jsonParser, function (req, res) {
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
})

app.post("/upload", function (req, res, next) {
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }
    console.log(req.file)
    lastUploadFile = req.file
    next();
})

app.post("/tasks", jsonParser, function (req, res) {
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }
    if (!req.body)
        return res.sendStatus(404)
    let ids = readToJSON(idPath)
    let data = readToJSON(dataPath, true)    

    ids.taskId = ids.taskId + 1
    ids.userId = ids.userId;
    if (req.body.name === "") {
        req.body.name = `New task-${ids.taskId}`
    }
    if (req.body.expires === "") {
        req.body.expires = moment(new Date()).add(1, 'days').format('YYYY-MM-DDThh:mm')
    }
    if (req.body.name === "") {
        req.body.name = `New task-${data.taskId}`
    }

    if (req.body.description === "") {
        req.body.description = `No description:(`
    }

    if (req.body.expires === "") {
        req.body.expires = moment(new Date()).add(1, 'days')
    }

    if (userId == undefined)
    {
        return res.status(401).json({ message: 'Not authorized' })
    }
    const task = new Task(ids.taskId, userId, req.body.name, req.body.expires, req.body.description, lastUploadFile)
    data[0].push(task)

    console.log("POST task")
    console.log(req.body)

    writeToJSON(idPath, ids)
    writeToJSON(dataPath, data)
    let userdata = readToJSON(dataPath, false)
    res.send(JSON.stringify(userdata, null, 2))
})

app.put("/tasks/complete/:taskId", jsonParser, function (req, res) {
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }
    if (!req.body)
        return res.sendStatus(404)
    let data = readToJSON(dataPath, true)

    const taskId = req.params.taskId
    const index = data[0].findIndex(x => x.id == parseInt(taskId))
    data[0][index].isComplete = true

    writeToJSON(dataPath, data)
    let userdata = readToJSON(dataPath, false)
    res.send(JSON.stringify(userdata, null, 2))
})

app.delete("/tasks/:taskId", function (req, res) {
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }

    const taskId = req.params.taskId
    let data = readToJSON(dataPath, true)

    data[0] = data[0].filter(x => x.id !== parseInt(taskId))
    writeToJSON(dataPath, data)
    let userdata = readToJSON(dataPath, false)
    res.send(JSON.stringify(userdata, null, 2))
})

app.listen(3000)
