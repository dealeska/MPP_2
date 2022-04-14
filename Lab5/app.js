const express = require("express")
const bcrypt = require('bcrypt')
const http = require("http")
const multer = require("multer")
const cookieParser = require('cookie-parser')
const cookies = require('cookie-parse')
const jwt = require('jsonwebtoken')
const crud = require('./crud.js')
const rw = require('./utils/json.js')
let { graphql, buildSchema } = require('graphql')
const io = require("socket.io")({
    serveClient: true,
    cookie: true
})

let lastFile

// Простая схема
let schema = buildSchema(`    
    input CreateTaskInput {
        name: String!
        expires: String
        description: String
    }

    type File {
        fieldname: String!
        originalname: String!
        encoding: String!
        mimetype: String!
        destination: String!
        filename: String!
        path: String!
        size: ID!
    }

    type Task {
        id: ID!
        name: String!
        expires: String
        description: String
        isComplete: Boolean!
        file: File
    }   

    type Tasks {
        tasks: [Task!]
    }

    type Query {
        getTasks: Tasks
    }
    
    type Mutation {
        createTask(input: CreateTaskInput!): Tasks
        completeTask(taskId: ID!): Tasks
        deleteTask(taskId: ID!): Tasks
    }
`);

// функции распознавания каждого endpoint'a
let root = {
    getTasks: () => {
        return crud.onReadTasks()
    },
    createTask: ({ input }) => {
        crud.onCreateTask(input, lastFile)
        return crud.onReadTasks()
    },
    completeTask: ({ taskId }) => {
        crud.onUpdateCompleted(taskId)
        return crud.onReadTasks()
    },
    deleteTask: ({ taskId }) => {
        crud.onDeleteTask(taskId)
        return crud.onReadTasks()
    }
}

const port = 3333
const jsonParser = express.json()
const app = express()
const server = http.createServer(app)

app.use(express.static(__dirname + "/views/public"))

const usersPath = 'users.json'
const tokenKey = 'b91028378997c0b3581821456edefd0ec'

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
    console.log('auth', req.cookies)
    try {
        let decoded = jwt.verify(req.cookies.token, tokenKey)
        let users = rw.readToJSON(usersPath)
        let user = users.find(u => u.login === decoded.login)
        req.logged = user !== undefined && await bcrypt.compare(decoded.password, user.hashedPassword)
    } catch {
        req.logged = false
    }
    next()
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
        let users = rw.readToJSON(usersPath)
        let user = users.find(u => u.login === decoded.login)
        logged = user !== undefined && await bcrypt.compare(decoded.password, user.hashedPassword)
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

    socket.on("askTasks", (query) => {
        console.log('query на get!', query)
        graphql(schema, query, root).then((response) => {
            console.log(response.data.getTasks)
            socket.emit("getTasks", JSON.stringify(response.data.getTasks))
        })
    })

    socket.on("createTask", (query, params) => {
        graphql(schema, query, root, null, params).then((response) => {
            socket.emit("getTasks", JSON.stringify(response.data.createTask))
        })
    })

    socket.on("completeTask", (query, params) => {
        graphql(schema, query, root, null, params).then((response) => {
            console.log(response)
            socket.emit("getTasks", JSON.stringify(response.data.completeTask))
        });
    })

    socket.on("deleteTask", (query, params) => {
        graphql(schema, query, root, null, params).then((response) => {
            console.log(response)
            socket.emit("getTasks", JSON.stringify(response.data.deleteTask))
        })
    })
})

app.get("/download/:taskId/:filename", function (req, res) {
    console.log(req.logged)
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }
    crud.onDownload(req, res)
})

app.post("/signIn", jsonParser, function (req, res) {
    crud.onSignIn(req, res);
})

app.post("/signUp", jsonParser, function (req, res) {
    crud.onSignUp(req, res);
})

app.post("/upload", function (req, res, next) {
    if (!req.logged) {
        return res.status(401).json({ message: 'Not authorized' })
    }
    console.log(req.file)
    lastFile = req.file
    next()
})

io.attach(server)
server.listen(port)
