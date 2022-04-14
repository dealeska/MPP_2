const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const moment = require('moment')
const rw = require('./utils/json.js')
const Task = require('./task')

const dataPath = 'data.json'
const idPath = 'id.json'
const usersPath = 'users.json'
const tokenKey = 'b91028378997c0b3581821456edefd0ec'

module.exports.onReadTasks = function () {
    return rw.readToJSON(dataPath)
}

module.exports.onCreateTask = function (newTaskData, lastFile) {
    let ids = rw.readToJSON(idPath)
    let data = rw.readToJSON(dataPath)

    ids.taskId = ids.taskId + 1;
    if (newTaskData.name === "") {
        newTaskData.name = `New task-${ids.taskId}`
    }
    if (newTaskData.expires === "") {
        newTaskData.expires = moment(new Date()).add(1, 'days').format('YYYY-MM-DDThh:mm')
    }

    const task = new Task(ids.taskId, newTaskData.name, newTaskData.expires, newTaskData.description, lastFile)
    data.tasks.push(task)

    rw.writeToJSON(idPath, ids)
    rw.writeToJSON(dataPath, data)
}

module.exports.onUpdateCompleted = function (taskId) {
    let data = rw.readToJSON(dataPath)

    const index = data.tasks.findIndex(x => x.id == parseInt(taskId))
    data.tasks[index].isComplete = true

    rw.writeToJSON(dataPath, data)
}

module.exports.onDeleteTask = function (taskId) {
    let data = rw.readToJSON(dataPath)
    data.tasks = data.tasks.filter(x => x.id !== parseInt(taskId))
    rw.writeToJSON(dataPath, data)
}

module.exports.onDownload = function (req, res) {
    let path = process.cwd() + "\\uploads\\" + req.params.filename
    let taskId = req.params.taskId
    let data = rw.readToJSON(dataPath)
    let originalName = data.tasks.filter(x => x.id === parseInt(taskId))[0].file.originalname

    res.download(path, originalName)
}

module.exports.onSignIn = async function (req, res) {
    console.log(req.body)
    let users = rw.readToJSON(usersPath)
    let user = users.find(u => u.login === req.body.login)
    if (user !== undefined) {
        const match = await bcrypt.compare(req.body.password, user.hashedPassword)
        if (match) {
            let token = jwt.sign(req.body, tokenKey, { expiresIn: '1h' })
            res.cookie('token', token, { httpOnly: true })
            res.send(rw.readToJSON(dataPath))
        }
        else {
            res.status(401).json({ message: 'Bad password' })
        }
    } else {
        res.status(401).json({ message: 'Not authorized' })
    }
}

module.exports.onSignUp = function (req, res) {
    console.log(req.body)
    let users = rw.readToJSON(usersPath)
    let user = users.find(u => u.login === req.body.login)
    if (user === undefined) {
        users.push({ login: req.body.login, hashedPassword: req.body.password })
        let token = jwt.sign(req.body, tokenKey, { expiresIn: '1h' })
        res.cookie('token', token, { httpOnly: true })
        rw.writeToJSON(usersPath, users)
        res.send(rw.readToJSON(dataPath))
    } else {
        res.status(401).json({ message: 'Not authorized' })
    }
}
