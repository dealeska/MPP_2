const express = require('express')
const multer = require("multer")
const bodyParser = require("body-parser")
const moment = require('moment')
const Task = require('./task')
const fs = require('fs')

const app = express()
app.locals.moment = require('moment')
app.set('view engine', 'pug')

const urlencodedParser = bodyParser.urlencoded({ extended: false })

let data;
let lastUploadFile;

if (fs.existsSync('data.json')) {
    const jsonString = fs.readFileSync('data.json').toString();
    data = JSON.parse(jsonString);
    data.tasks.forEach(task => task.expires = new Date(task.expires))
} else {
    data = {
        tasks: [],
        taskId: 0
    }
}

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

app.use("/about", function (request, response) {
    response.send("<h3>inf:</h3>" + JSON.stringify(data));
});

app.get('/', (req, res) => {
    res.render('pages/index', { todos: data.tasks })
})

setInterval(function () {
    app.get('/', (req, res) => {
        res.render('pages/index', { todos: data.tasks })
    })
}, 7000);

app.get("/download/:taskId/:filename", function (request, response) {
    let path = process.cwd() + "\\uploads\\" + request.params["filename"]
    let taskId = request.params["taskId"]
    let originalName = data.tasks.filter(x => x.id === parseInt(taskId))[0].file.originalname
    response.download(path, originalName)
})

app.get("/*", function (request, response) {
    response.send("404 Not Found");
})

app.post("/", function (request, response, next) {
    lastUploadFile = request.file
    next()
})

app.post("/", urlencodedParser, function (request, response) {
    if (!request.body) {
        return response.sendStatus(400)
    }

    if (request.body["add-task"] !== undefined) {
        data.taskId++;
        if (request.body["task-name"] === "") {
            request.body["task-name"] = `New task-${data.taskId}`
        }

        if (request.body["task-description"] === "") {
            request.body["task-description"] = `No description:(`
        }

        if (request.body["task-expires"] === "") {
            request.body["task-expires"] = moment(new Date()).add(1, 'days')
        }

        const task = new Task(data.taskId, request.body["task-name"], new Date(request.body["task-expires"]), request.body["task-description"], lastUploadFile)
        data.tasks.push(task)

        let jsonData = JSON.stringify(data)
        fs.writeFileSync("data.json", jsonData)

        response.render('pages/index', { todos: data.tasks })

    } else if (request.body["delete-task"]) {
        let taskId = request.body["delete-task"]
        data.tasks = data.tasks.filter(value => value.id !== parseInt(taskId))

        const jsonData = JSON.stringify(data)
        fs.writeFileSync("data.json", jsonData)

        response.render('pages/index', { todos: data.tasks })

    } else if (request.body["complete-task"]) {
        let taskId = request.body["complete-task"]

        const index = data.tasks.findIndex(x => x.id == parseInt(taskId))
        data.tasks[index].isComplete = true

        const jsonData = JSON.stringify(data)
        fs.writeFileSync("data.json", jsonData)

        response.render('pages/index', { todos: data.tasks })

    } else {
        response.send("404 Not Found");
    }
})

app.listen(3000)
