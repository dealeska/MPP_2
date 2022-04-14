function getTasksQuery() {
    return `
        query GetTasks {
            getTasks {
                tasks {
                    id
                    name
                    expires
                    description
                    isComplete
                    file {
                        fieldname
                        originalname
                        encoding
                        mimetype
                        destination
                        filename
                        path
                        size
                    }
                }
            }
        }`;
}

function createTaskQuery() {
    return `
        mutation CreateTask($input: CreateTaskInput!) {
          createTask(input: $input) {
            tasks {
                    id
                    name
                    expires
                    description
                    isComplete
                    file {
                        fieldname
                        originalname
                        encoding
                        mimetype
                        destination
                        filename
                        path
                        size
                    }
                }
          }
        }`;
}

function deleteTaskQuery() {
    return `
        mutation DeleteTask($taskId: ID!) {
          deleteTask(taskId: $taskId) {
            tasks {
                    id
                    name
                    expires
                    description
                    isComplete
                    file {
                        fieldname
                        originalname
                        encoding
                        mimetype
                        destination
                        filename
                        path
                        size
                    }
                }
          }
        }`;
}

function completeTaskQuery() {
    return `
        mutation CompleteTask($taskId: ID!) {
          completeTask(taskId: $taskId) {
            tasks {
                    id
                    name
                    expires
                    description
                    isComplete
                    file {
                        fieldname
                        originalname
                        encoding
                        mimetype
                        destination
                        filename
                        path
                        size
                    }
                }
          }
        }`;
}