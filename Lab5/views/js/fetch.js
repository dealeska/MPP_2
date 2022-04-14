let socket;

function resolveTasks(jsonData) {
    const data = JSON.parse(jsonData)
    reset()
    drawRoot()
    drawTasks(data.tasks)
}

function raiseConnection() {
    socket = io()

    socket.on('connect_error', function (err) {
        reset()
        drawsignInRoot()
    })

    socket.on("getTasks", data => resolveTasks(data))
}

async function responseRoutine(response) {
    if (response.ok === true) {
        raiseConnection()
        await fetchTasks()
    } else if (response.status === 401) {
        reset()
        drawsignInRoot()
    }
}

function onSignIn(e) {
    e.preventDefault();
    const form = document.forms["signIn"];
    let user = {
        login: form.elements["login"].value,
        password: form.elements["password"].value
    };
    console.log(user);
    sendUser(user).then();
}

function onSignUp(e) {
    e.preventDefault();
    const form = document.forms["signUp"];
    const hashedPassword = dcodeIO.bcrypt.hashSync(form.elements["password"].value, 10);
    let user = {
        login: form.elements["login"].value,
        password: hashedPassword
    };
    console.log(user);
    addUser(user).then();
}

async function sendUser(user) {
    const response = await fetch('/signIn', {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(user)
    });
    await responseRoutine(response);
}

async function addUser(user) {
    const response = await fetch('/signUp', {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(user)
    });
    await responseRoutine(response);
}

async function fetchTasks() {
    socket.emit("askTasks", getTasksQuery())
}

async function createTask(input, file) {
    console.log(file.files);
    const formData = new FormData();
    formData.append('task-files', file.files[0]);
    await fetch(`/upload`, {
        method: "POST",
        body: formData
    })
    socket.emit("createTask", createTaskQuery(), { input });
}

async function deleteTask(taskId) {
    socket.emit("deleteTask", deleteTaskQuery(), { taskId })
}

async function completeTask(task) {
    const taskId = task.id
    socket.emit("completeTask", completeTaskQuery(), { taskId })
}

function reset() {
    document.getElementById("root").innerHTML = "";
}

function drawTasks(tasks) {
    let taskRows = ""
    tasks.forEach(task => {
        taskRows += getTask(task)
    })
    document.getElementById("root").insertAdjacentHTML('afterbegin', getTableRoot(taskRows))
    tasks.forEach(task => {
        console.log(document.getElementById(`complete-${task.id}`))
        document.getElementById(`delete-${task.id}`).addEventListener("click", e => deleteTask(task.id))
        if (!task.isComplete) {
            document.getElementById(`complete-${task.id}`).addEventListener("click", e => completeTask(task))
        }
    })
}

function drawRoot() {
    reset()
    document.getElementById("root").insertAdjacentHTML('beforeend', getNewTaskRoot())
    document.forms["add-task"].addEventListener("submit", e => {
        e.preventDefault();
        const form = document.forms["add-task"];
        let obj = {
            name: form.elements["task-name"].value,
            expires: form.elements["task-expires"].value,
            description: form.elements["task-description"].value
        };
        createTask(obj, form.elements["task-files"]).then();
    });
}

function drawsignInRoot() {
    reset()
    document.getElementById("root").insertAdjacentHTML('beforeend', getsignInRoot())
    document.getElementById("sup").addEventListener("click", e => {
        e.preventDefault()
        drawsignUpRoot()
    })
    document.forms["signIn"].addEventListener("submit", e => onSignIn(e));
}

function drawsignUpRoot() {
    reset()
    document.getElementById("root").insertAdjacentHTML('beforeend', getsignUpRoot())
    document.getElementById("sin").addEventListener("click", e => {
        e.preventDefault()
        drawsignInRoot()
    })
    document.forms["signUp"].addEventListener("submit", e => onSignUp(e));
}

drawRoot()
raiseConnection()
fetchTasks().then()