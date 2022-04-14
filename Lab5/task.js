class Task {
    constructor(id, name, expires, description, file) {
        this.id = id;
        this.name = name;
        this.expires = expires;
        this.description = description;
        this.isComplete = false;
        this.file = file;
    }
}

module.exports = Task