async function responseRoutine(response) {
    if (response.ok === true) {
        const data = await response.json();
        console.log('s' + data)
        reset();
        drawRoot();
        drawTasks(data[0]);
    } else if (response.status === 401) {
        reset();
        drawsignInRoot();
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
    const response = await fetch('/tasks', {
        method: "GET",
        headers: { "Accept": "application/json" }
    });
    await responseRoutine(response);
}

async function createTask(obj, file) {
    console.log(file.files);
    const formData = new FormData();
    formData.append('task-files', file.files[0]);
    await fetch(`/upload`, {
        method: "POST",
        body: formData
    });
    const response = await fetch(`/tasks`, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(obj)
    });
    await responseRoutine(response);
}

async function deleteTask(taskId) {
    const response = await fetch(`/tasks/${taskId}`, {
        method: "DELETE",
        headers: { "Accept": "application/json" }
    });
    await responseRoutine(response);
}

async function completeTask(task) {
    const taskId = task.id
    const response = await fetch(`/tasks/complete/${taskId}`, {
        method: "PUT",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(task)
    });
    await responseRoutine(response);
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

fetchTasks().then()