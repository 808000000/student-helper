// Load and initialize on startup
window.addEventListener("DOMContentLoaded", init);

const STORAGE_KEY = "tasks";

function init() {
  migrateStorageIfNeeded();
  renderAllTasks();
  setupEventHandlers();
}

function setupEventHandlers() {
  const taskInput = document.getElementById("taskInput");
  const taskList = document.getElementById("taskList");
  const addBtn = document.getElementById("addBtn");

  if (taskInput) {
    taskInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") addTask();
    });
  }

  if (taskList) {
    taskList.addEventListener("click", function (e) {
      const target = e.target;
      const li = target.closest("li");
      if (!li || !taskList.contains(li)) return;

      const taskId = li.dataset.id;

      if (target.matches("button.delete-btn")) {
        e.stopPropagation();
        deleteTask(taskId);
        li.remove();
        return;
      }

      // Toggle completion when clicking on the list item (but not the delete button)
      const nowCompleted = !li.classList.contains("completed");
      li.classList.toggle("completed");
      updateTaskStatus(taskId, nowCompleted);
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", addTask);
  }
}

function getTasks() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function setTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function generateId() {
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

function migrateStorageIfNeeded() {
  const tasks = getTasks();
  let migrated = false;
  const withIds = tasks.map(function (task) {
    if (task && typeof task === "object" && task.id) return task;
    migrated = true;
    return { id: generateId(), text: task.text, completed: !!task.completed };
  });
  if (migrated) setTasks(withIds);
}

function addTask() {
  const taskInput = document.getElementById("taskInput");
  const taskText = taskInput ? taskInput.value.trim() : "";
  if (taskText === "") return;

  const newTask = { id: generateId(), text: taskText, completed: false };
  const tasks = getTasks();
  tasks.push(newTask);
  setTasks(tasks);
  renderTask(newTask);
  if (taskInput) taskInput.value = "";
}

// Render all tasks from storage
function renderAllTasks() {
  const list = document.getElementById("taskList");
  if (!list) return;
  list.innerHTML = "";
  getTasks().forEach(renderTask);
}

// Render a single task
function renderTask(task) {
  const li = document.createElement("li");
  li.dataset.id = task.id;
  li.textContent = task.text;
  if (task.completed) li.classList.add("completed");

  const delBtn = document.createElement("button");
  delBtn.textContent = "X";
  delBtn.classList.add("delete-btn");
  li.appendChild(delBtn);

  const list = document.getElementById("taskList");
  if (list) list.appendChild(li);
}

// Update task status by id
function updateTaskStatus(id, completed) {
  const tasks = getTasks().map(function (task) {
    return task.id === id ? { id: task.id, text: task.text, completed: completed } : task;
  });
  setTasks(tasks);
}

// Delete a task by id
function deleteTask(id) {
  const tasks = getTasks().filter(function (task) { return task.id !== id; });
  setTasks(tasks);
}
