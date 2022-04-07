class Task {
    constructor(id, userId, name, expires, description, file) {
        this.id = id;
        this.userId = userId;
        this.name = name;
        this.expires = expires;
        this.description = description;
        this.isComplete = false;
        this.file = file;
    }
}

module.exports = Task