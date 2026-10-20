const newListItem = "<li class='task'>Nothing to see here</li>"

document.querySelector("#list").innerHTML += newListItem

function addTasks() {
    const list = document.querySelector("#list")

}

// --- Saving / loading (localStorage) ---
const STORAGE_KEY = "doit-data"

function loadData() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    } catch (err) {
        return {} // storage unavailable or data corrupted: start fresh
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks: tasks }))
    } catch (err) {
        console.warn("Could not save tasks:", err)
    }
}

function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// Each task is { id, name, done, desc }.
// Migrates the old format (array of name strings + separate completed/descriptions).
function loadTasks(saved) {
    if (!Array.isArray(saved.tasks)) return []

    const oldCompleted = new Set(saved.completed || [])
    const oldDescriptions = new Map(saved.descriptions || [])

    return saved.tasks.map((t) => {
        if (typeof t === "string") {
            return {
                id: makeId(),
                name: t,
                done: oldCompleted.has(t),
                desc: oldDescriptions.get(t) || ""
            }
        }
        return t
    })
}

const saved = loadData()

const tasks = loadTasks(saved)
const list = document.querySelector("#list")
const tasksForm = document.querySelector("#taskForm")
const taskInput = document.querySelector("#taskInput")
const listError = document.querySelector("#listError")

// --- Filter (show checked / unchecked) ---
const FILTER_KEY = "doit-filter"
const filterBtn = document.querySelector("#filterBtn")
const filterMenu = document.querySelector("#filterMenu")
const showChecked = document.querySelector("#showChecked")
const showUnchecked = document.querySelector("#showUnchecked")
const filterNote = document.querySelector("#filterNote")

function loadFilter() {
    try {
        const f = JSON.parse(localStorage.getItem(FILTER_KEY))
        if (f) return { checked: f.checked !== false, unchecked: f.unchecked !== false }
    } catch (err) { /* storage unavailable */ }
    return { checked: true, unchecked: true }
}

const filter = loadFilter()
showChecked.checked = filter.checked
showUnchecked.checked = filter.unchecked

function onFilterChange() {
    filter.checked = showChecked.checked
    filter.unchecked = showUnchecked.checked
    try {
        localStorage.setItem(FILTER_KEY, JSON.stringify(filter))
    } catch (err) {
        console.warn("Could not save filter:", err)
    }
    renderTasks()
}

showChecked.addEventListener("change", onFilterChange)
showUnchecked.addEventListener("change", onFilterChange)

filterBtn.addEventListener("click", (e) => {
    e.stopPropagation()
    const open = filterMenu.classList.toggle("hidden") === false
    filterBtn.setAttribute("aria-expanded", String(open))
})

// Close the menu when clicking elsewhere or pressing Escape
document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-wrap")) {
        filterMenu.classList.add("hidden")
        filterBtn.setAttribute("aria-expanded", "false")
    }
})
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        filterMenu.classList.add("hidden")
        filterBtn.setAttribute("aria-expanded", "false")
    }
})

function isVisible(taskData) {
    return taskData.done ? filter.checked : filter.unchecked
}

// Id of the task currently being dragged (null when nothing is dragged)
let draggedId = null

// Swap a task's title for a text input; Enter/blur saves, Escape cancels
function startEditing(taskData, task, label) {
    const input = document.createElement("input")
    input.type = "text"
    input.classList.add("task-edit")
    input.value = taskData.name

    task.draggable = false // so text can be selected inside the input
    let finished = false

    function finish(save) {
        if (finished) return
        finished = true
        const newName = input.value.trim()
        if (save && newName !== "") {
            taskData.name = newName
            saveData()
        }
        renderTasks()
    }

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finish(true)
        else if (e.key === "Escape") finish(false)
    })
    input.addEventListener("blur", () => finish(true))

    label.replaceWith(input)
    input.focus()
    input.select()
}

function renderTasks() {
    list.innerHTML = "";

    const visible = tasks.filter(isVisible)
    const filtering = !(filter.checked && filter.unchecked)
    filterBtn.textContent = (filtering ? "\u25BC Filter \u2022" : "\u25BC Filter")
    filterNote.textContent = filtering && tasks.length > 0
        ? `Showing ${visible.length} of ${tasks.length} tasks`
        : ""

    visible.forEach((taskData) => {
        const task = document.createElement("li")
        task.classList.add("task")
        task.draggable = true
        task.dataset.id = taskData.id

        const checkbox = document.createElement("input")
        checkbox.type = "checkbox"
        checkbox.classList.add("task-check")
        checkbox.checked = taskData.done
        checkbox.addEventListener("change", () => {
            taskData.done = checkbox.checked
            saveData()
            renderTasks()
        })

        const label = document.createElement("span")
        label.textContent = taskData.name
        label.classList.toggle("done", taskData.done)
        label.title = "Double-click to edit"

        // Double-click the title to edit it in place
        label.addEventListener("dblclick", () => startEditing(taskData, task, label))

        const deleteBtn = document.createElement("button")
        deleteBtn.type = "button"
        deleteBtn.textContent = "X"
        deleteBtn.classList.add("delete-x")
        deleteBtn.addEventListener("click", () => {
            const index = tasks.findIndex((t) => t.id === taskData.id)
            tasks.splice(index, 1)
            saveData()
            renderTasks()
        })

        const desc = document.createElement("textarea")
        desc.classList.add("task-desc")
        desc.placeholder = "Whachu doin' here..."
        desc.rows = 2
        desc.value = taskData.desc
        desc.addEventListener("input", () => {
            taskData.desc = desc.value // no re-render, so focus is kept
            saveData()
        })
        // Let the user select text inside the box instead of dragging the whole task
        desc.addEventListener("focus", () => { task.draggable = false })
        desc.addEventListener("blur", () => { task.draggable = true })

        // --- Drag and drop ---
        task.addEventListener("dragstart", (e) => {
            draggedId = taskData.id
            e.dataTransfer.effectAllowed = "move"
            e.dataTransfer.setData("text/plain", taskData.name) // required by Firefox
            task.classList.add("dragging")
        })

        task.addEventListener("dragend", () => {
            draggedId = null
            task.classList.remove("dragging")
            document
                .querySelectorAll("#list li.drag-over")
                .forEach((li) => li.classList.remove("drag-over"))
        })

        task.addEventListener("dragover", (e) => {
            if (draggedId === null || draggedId === taskData.id) return
            e.preventDefault() // allows dropping here
            e.dataTransfer.dropEffect = "move"
            task.classList.add("drag-over")
        })

        task.addEventListener("dragleave", () => {
            task.classList.remove("drag-over")
        })

        task.addEventListener("drop", (e) => {
            e.preventDefault()
            task.classList.remove("drag-over")
            if (draggedId === null || draggedId === taskData.id) return

            const fromIndex = tasks.findIndex((t) => t.id === draggedId)
            const toIndex = tasks.findIndex((t) => t.id === taskData.id)

            // Remove from old spot, insert at the target's position
            const [moved] = tasks.splice(fromIndex, 1)
            tasks.splice(toIndex, 0, moved)

            draggedId = null
            saveData()
            renderTasks()
        })

        task.append(checkbox, label, deleteBtn, desc)
        list.append(task)
    })
}

tasksForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const taskName = taskInput.value.trim()

    if (taskName == "") {
        listError.textContent = "You gotta add sumin'!"
        return
    }
    listError.textContent = "";

    tasks.push({ id: makeId(), name: taskName, done: false, desc: "" })
    saveData()
    renderTasks()
    tasksForm.reset()
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
title.style.color = "rgb(208, 208, 208)"
title.classList.add("highlight")


// --- Voice commands (Web Speech API) ---
// Click the mic once, then start any command with "Hey Do-It". Try saying:
//   "Hey Do-It, add buy milk"     "Hey Do-It, complete buy milk"     "Hey Do-It, uncheck buy milk"
//   "Hey Do-It, delete buy milk"  "Hey Do-It, clear completed"  "Hey Do-It, delete all tasks"
// (or say just "Hey Do-It", wait for "I'm listening…", then say the command)
const voiceBtn = document.querySelector("#voiceBtn")
const voiceStatus = document.querySelector("#voiceStatus")
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition

function setVoiceStatus(message) {
    voiceStatus.textContent = message
}

// Exact match first, then partial match ("milk" finds "Buy milk")
function findTaskByName(query) {
    const q = query.toLowerCase().trim()
    if (q === "") return null
    return (
        tasks.find((t) => t.name.toLowerCase() === q) ||
        tasks.find((t) => t.name.toLowerCase().includes(q)) ||
        null
    )
}

function handleVoiceCommand(rawText) {
    // Speech engines add capitalization and punctuation; strip trailing punctuation
    const spoken = rawText.trim().replace(/[.!?,]+$/, "")
    let m

    // "clear completed" (checked before "delete ..." so it isn't read as a task name)
    if (/^(?:clear|remove|delete)\s+(?:all\s+)?(?:completed|done|finished)(?:\s+tasks)?$/i.test(spoken)) {
        const before = tasks.length
        for (let i = tasks.length - 1; i >= 0; i--) {
            if (tasks[i].done) tasks.splice(i, 1)
        }
        const removed = before - tasks.length
        saveData()
        renderTasks()
        setVoiceStatus()
        return
    }

    // "delete all tasks" / "clear all tasks" / "remove everything" (checked before "delete ..." so it isn't read as a task name)
    if (/^(?:clear|remove|delete|erase)\s+(?:all|every|everything)(?:\s+(?:of\s+)?(?:the\s+|my\s+)?(?:tasks?|items?|things?))?$/i.test(spoken)) {
        tasks.length = 0
        listError.textContent = ""
        saveData()
        renderTasks()
        setVoiceStatus()
        return
    }

    // "add buy milk" / "add a new task called buy milk"
    if ((m = spoken.match(/^(?:add|new|create)(?:\s+a)?(?:\s+new)?(?:\s+task)?(?:\s+(?:called|named))?\s+(.+)$/i))) {
        const name = m[1].charAt(0).toUpperCase() + m[1].slice(1)
        tasks.push({ id: makeId(), name: name, done: false, desc: "" })
        listError.textContent = ""
        saveData()
        renderTasks()
        setVoiceStatus()
        return
    }

    // "uncheck buy milk" (checked before "complete" so wording can't collide)
    if ((m = spoken.match(/^(?:uncheck|uncomplete|undo|reopen)\s+(.+)$/i))) {
        const task = findTaskByName(m[1])
        if (!task) return setVoiceStatus(`Couldn't find a task matching "${m[1]}".`)
        task.done = false
        saveData()
        renderTasks()
        return setVoiceStatus()
    }

    // "complete buy milk" / "check off buy milk" / "mark buy milk as done"
    if ((m = spoken.match(/^(?:complete|finish|check(?:\s+off)?|mark)\s+(.+?)(?:\s+as\s+(?:done|complete|completed|finished))?$/i))) {
        const task = findTaskByName(m[1])
        if (!task) return setVoiceStatus(`Couldn't find a task matching "${m[1]}".`)
        task.done = true
        saveData()
        renderTasks()
        return setVoiceStatus()
    }

    // "delete buy milk" / "remove buy milk"
    if ((m = spoken.match(/^(?:delete|remove)\s+(.+)$/i))) {
        const task = findTaskByName(m[1])
        if (!task) return setVoiceStatus(`Couldn't find a task matching "${m[1]}".`)
        tasks.splice(tasks.indexOf(task), 1)
        saveData()
        renderTasks()
        return setVoiceStatus()
    }

    setVoiceStatus("Whachu say?")
}

if (!SpeechRecognitionAPI) {
    voiceBtn.disabled = true
    setVoiceStatus("Voice commands aren't supported in this browser (try Chrome, Edge, or Safari).")
} else {
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = "en-US"
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = true // keep listening after each command

    let wantListening = false // what the user asked for (mic toggle)

    // Wake word: tolerant of how speech engines spell "do it" ("Do-It", "doit", "dew it")
    const WAKE_REGEX = /\b(?:hey|hay|hi|okay|ok)[,.\s-]+(?:do[\s-]?it|dew[\s-]?it|doit)\b[,.!?\s]*/i
    const AWAKE_MS = 8000 // how long to wait for a command after just "Hey Do-It"
    const WAITING_MSG = 'Say "Hey Do-It"… (click the mic to stop)'
    let awake = false
    let awakeTimer = null

    function setAwake(on) {
        awake = on
        clearTimeout(awakeTimer)
        voiceBtn.classList.toggle("awake", on)
        if (on) {
            setVoiceStatus("What we doin'?")
            awakeTimer = setTimeout(() => {
                setAwake(false)
                setVoiceStatus(WAITING_MSG)
            }, AWAKE_MS)
        }
    }

    function startListening() {
        try {
            recognition.start()
        } catch (err) {
            // already started; safe to ignore
        }
    }

    voiceBtn.addEventListener("click", () => {
        wantListening = !wantListening
        if (wantListening) {
            startListening()
        } else {
            setAwake(false)
            recognition.stop()
            setVoiceStatus()
        }
    })

    recognition.addEventListener("start", () => {
        voiceBtn.classList.add("listening")
        if (!awake) setVoiceStatus(WAITING_MSG)
    })

    recognition.addEventListener("end", () => {
        voiceBtn.classList.remove("listening")
        // Browsers end sessions after a while; quietly restart while the mic is "on"
        if (wantListening) setTimeout(startListening, 300)
    })

    recognition.addEventListener("result", (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (!event.results[i].isFinal) continue
            const transcript = event.results[i][0].transcript
            console.log("Heard: " + transcript)

            const wake = transcript.match(WAKE_REGEX)
            if (wake) {
                // "Hey Do-It, add buy milk" -> run "add buy milk" right away
                const rest = transcript.slice(wake.index + wake[0].length).trim()
                if (rest) {
                    setAwake(false)
                    handleVoiceCommand(rest)
                } else {
                    setAwake(true) // just the wake word: wait for the command
                }
            } else if (awake) {
                setAwake(false)
                handleVoiceCommand(transcript)
            }
            // otherwise: not addressed to Do-It, so ignore it
        }
    })

    recognition.addEventListener("error", (event) => {
        if (event.error === "no-speech" || event.error === "aborted") return // normal while idle; auto-restarts

        wantListening = false // stop the restart loop on real errors
        setAwake(false)
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setVoiceStatus("Microphone access was blocked. Allow it in your browser's site settings.")
        } else {
            setVoiceStatus("Voice error: " + event.error)
        }
    })
}
// --- Clock ---
const clock = document.querySelector("#clock")

function updateClock() {
    const now = new Date()
    const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    clock.textContent = `${date} · ${time}`
}

updateClock()                    // show it immediately instead of waiting a second
setInterval(updateClock, 1000)   // then refresh every second


// --- Dark mode ---
const themeBtn = document.querySelector("#themeBtn")
const THEME_KEY = "doit-theme"

function applyTheme(dark) {
    document.body.classList.toggle("dark", dark)
    themeBtn.textContent = dark ? "☀️" : "🌙"
    themeBtn.setAttribute("aria-pressed", String(dark))
    themeBtn.title = dark ? "Switch to light mode" : "Switch to dark mode"
}

function loadTheme() {
    try {
        const stored = localStorage.getItem(THEME_KEY)
        if (stored) return stored === "dark"
    } catch (err) { /* storage unavailable */ }
    // No saved choice: follow the system setting
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
}

themeBtn.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark")
    applyTheme(dark)
    try {
        localStorage.setItem(THEME_KEY, dark ? "dark" : "light")
    } catch (err) {
        console.warn("Could not save theme:", err)
    }
})

applyTheme(loadTheme())