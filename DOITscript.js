const newListItem = "<li class='task'>Watermelons</li>"

document.querySelector("#list").innerHTML += newListItem

function addTasks() {
    const list = document.querySelector("#list")

    const pineapple = document.createElement("li")
    pineapple.classList.add("task")
    pineapple.textContent = "Pineapple"

    const papaya = document.createElement("li")
    papaya.classList.add("task")
    papaya.textContent = "Papaya"

    list.append(pineapple, papaya)
}

const tasks = []
const list = document.querySelector("#list")
const tasksForm = document.querySelector("#taskForm")
const taskInput = document.querySelector("#taskInput")
const deleteTask = document.querySelector("#deleteTask")
const sortTasks = document.querySelector("#sortTasks")
const listError = document.querySelector("#listError")

function renderTasks() {
    list.innerHTML = "";

    tasks.forEach((taskName) => {
        const task = document.createElement("li")
        task.classList.add("task")
        task.textContent = taskName
        list.append(task)
    })
}

tasksForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const taskName = taskInput.value.trim()

    if (taskName == "") {
        listError.textContent = "Please enter a task name"
        return
    } else if (tasks.includes(taskName)) {
        listError.textContent = "That task is already in the list"
        return
    }
    listError.textContent = "";

    tasks.push(taskName)
    renderTasks()
    tasksForm.reset()
})

deleteTask.addEventListener("click", () => {
    const taskName = taskInput.value.trim()

    if (tasks.includes(taskName)) {
        const taskNameIndex = tasks.indexOf(taskName)
        tasks.splice(taskNameIndex, 1)
        renderTasks()
    }
})

sortTasks.addEventListener("click", () => {
    tasks.sort()
    renderTasks()
})

renderTasks();

taskInput.addEventListener("keydown", (event) => {
    console.log("Key pressed is: " + event.key)
})

taskInput.addEventListener("input", (event) => {
    console.log("Input is: " + event.target.value)
})

const title = document.querySelector("#title")

function titleHover() {
    console.log("Hovering over title(mouseover")
}

title.addEventListener("mouseover", titleHover)
title.style.color = "rgb(255, 255, 255)"
title.classList.add("highlight")