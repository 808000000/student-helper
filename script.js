// Load and initialize on startup
window.addEventListener("DOMContentLoaded", init);

const STORAGE_KEY = "tasks";
const FILTER_KEY = "tasks_filter";
let currentFilter = localStorage.getItem(FILTER_KEY) || "all"; // all | active | completed

function init() {
  migrateStorageIfNeeded();
  renderAllTasks();
  setupEventHandlers();
}

function setupEventHandlers() {
  const taskInput = document.getElementById("taskInput");
  const taskList = document.getElementById("taskList");
  const addBtn = document.getElementById("addBtn");
  const filterAllBtn = document.getElementById("filterAll");
  const filterActiveBtn = document.getElementById("filterActive");
  const filterCompletedBtn = document.getElementById("filterCompleted");
  const clearCompletedBtn = document.getElementById("clearCompleted");

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
        updateRemainingCount();
        return;
      }

      // Toggle completion when clicking on the list item (but not the delete button)
      const nowCompleted = !li.classList.contains("completed");
      li.classList.toggle("completed");
      updateTaskStatus(taskId, nowCompleted);
      updateRemainingCount();
    });

    // Inline edit on double-click
    taskList.addEventListener("dblclick", function (e) {
      const li = e.target.closest("li");
      if (!li || !taskList.contains(li)) return;
      const taskId = li.dataset.id;
      startInlineEdit(li, taskId);
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", addTask);
  }

  // Filters
  function setFilter(filter) {
    currentFilter = filter;
    localStorage.setItem(FILTER_KEY, filter);
    updateFilterButtonsState();
    renderAllTasks();
  }
  if (filterAllBtn) filterAllBtn.addEventListener("click", function () { setFilter("all"); });
  if (filterActiveBtn) filterActiveBtn.addEventListener("click", function () { setFilter("active"); });
  if (filterCompletedBtn) filterCompletedBtn.addEventListener("click", function () { setFilter("completed"); });

  // Clear completed
  if (clearCompletedBtn) clearCompletedBtn.addEventListener("click", function () {
    const remaining = getTasks().filter(function (t) { return !t.completed; });
    setTasks(remaining);
    renderAllTasks();
  });

  // Initialize buttons state and counter
  updateFilterButtonsState();
  updateRemainingCount();
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
  updateRemainingCount();
}

// Render all tasks from storage
function renderAllTasks() {
  const list = document.getElementById("taskList");
  if (!list) return;
  list.innerHTML = "";
  getFilteredTasks().forEach(renderTask);
  updateRemainingCount();
}

// Render a single task
function renderTask(task) {
  const li = document.createElement("li");
  li.dataset.id = task.id;
  li.appendChild(createTaskLabel(task.text));
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

// Helpers for filtering and UI state
function getFilteredTasks() {
  const all = getTasks();
  if (currentFilter === "active") return all.filter(function (t) { return !t.completed; });
  if (currentFilter === "completed") return all.filter(function (t) { return t.completed; });
  return all;
}

function updateRemainingCount() {
  const el = document.getElementById("remainingCount");
  if (!el) return;
  const count = getTasks().filter(function (t) { return !t.completed; }).length;
  el.textContent = String(count);
}

function updateFilterButtonsState() {
  const mapping = {
    all: document.getElementById("filterAll"),
    active: document.getElementById("filterActive"),
    completed: document.getElementById("filterCompleted")
  };
  ["all", "active", "completed"].forEach(function (key) {
    const btn = mapping[key];
    if (!btn) return;
    btn.setAttribute("aria-pressed", String(key === currentFilter));
    btn.classList.toggle("active", key === currentFilter);
  });
}

function createTaskLabel(text) {
  const span = document.createElement("span");
  span.className = "task-label";
  span.textContent = text;
  return span;
}

function startInlineEdit(li, taskId) {
  // Avoid duplicate editors
  if (li.querySelector("input.edit-input")) return;
  const tasks = getTasks();
  const task = tasks.find(function (t) { return t.id === taskId; });
  if (!task) return;

  const label = li.querySelector(".task-label");
  const originalText = task.text;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "edit-input";
  input.value = originalText;
  input.setAttribute("aria-label", "Edit task");

  // Replace label with input
  if (label) li.replaceChild(input, label);
  input.focus();
  input.select();

  function finish(save) {
    const newText = input.value.trim();
    const finalText = save && newText !== "" ? newText : originalText;
    const updated = tasks.map(function (t) {
      return t.id === taskId ? { id: t.id, text: finalText, completed: t.completed } : t;
    });
    setTasks(updated);
    // Restore label
    const newLabel = createTaskLabel(finalText);
    li.replaceChild(newLabel, input);
  }

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", function () { finish(true); });
}
