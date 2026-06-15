import "./style.css";

const currentOperandTextElement = document.getElementById("current-operand");
const previousOperandTextElement = document.getElementById("previous-operand");
const statusBar = document.getElementById("status-bar");
const statusDot = statusBar.querySelector(".dot");
const statusText = statusBar.lastChild;
const keypad = document.querySelector(".keypad");

const historyDrawer = document.getElementById("history-drawer");
const historyToggle = document.getElementById("history-toggle");
const historyClose = document.getElementById("history-close");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");
const themeToggle = document.getElementById("theme-toggle");

const THEME_STORAGE_KEY = "theme";
const HISTORY_STORAGE_KEY = "calc_history";
const MAX_HISTORY_ITEMS = 20;
const OPERATION_SYMBOLS = Object.freeze({
  add: "+",
  subtract: "-",
  multiply: "x",
  divide: "÷",
});

const isTest = navigator.webdriver;
if (isTest) {
  document.body.classList.add("is-test");
}

const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "dark";
if (savedTheme === "light") {
  document.body.classList.add("light-theme");
}

let currentOperand = "";
let previousOperand = "";
let operation = undefined;
let shouldResetScreen = false;
let isComputing = false;
let history = loadHistory();

renderHistory();

keypad.addEventListener("click", async (event) => {
  const button = event.target.closest(".btn");
  if (!button || !keypad.contains(button) || isComputing) return;

  if (!isTest) {
    createRipple(event, button);
    triggerDisplayPop();
  }

  const number = button.dataset.num;
  const op = button.dataset.op;

  if (number !== undefined) {
    appendNumber(number);
    return;
  }

  if (op !== undefined) {
    await chooseOperation(op);
    return;
  }

  if (button.id === "clear") {
    clear();
    return;
  }

  if (button.id === "delete") {
    deleteNumber();
    return;
  }

  if (button.id === "equals") {
    if (currentOperand === "0000" && !previousOperand) {
      triggerEasterEgg();
      return;
    }
    await compute();
  }
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
  const currentTheme = document.body.classList.contains("light-theme")
    ? "light"
    : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
});

historyToggle.addEventListener("click", () => {
  historyDrawer.classList.add("open");
});

historyClose.addEventListener("click", () => {
  historyDrawer.classList.remove("open");
});

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  saveHistory();
  renderHistory();
});

function createRipple(event, button) {
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  const rect = button.getBoundingClientRect();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add("ripple");

  button.querySelector(".ripple")?.remove();
  button.appendChild(circle);
}

function triggerDisplayPop() {
  currentOperandTextElement.classList.remove("pop-effect");
  requestAnimationFrame(() => {
    currentOperandTextElement.classList.add("pop-effect");
  });
}

function clear() {
  currentOperand = "";
  previousOperand = "";
  operation = undefined;
  shouldResetScreen = false;
  updateDisplay();
  setStatus("Prêt", "ready");
}

function triggerEasterEgg() {
  document.body.classList.add("party-mode");
  setStatus("PARTY MODE!", "cached");

  setTimeout(() => {
    document.body.classList.remove("party-mode");
    setStatus("Prêt", "ready");
    currentOperand = "";
    updateDisplay();
  }, 4000);
}

function deleteNumber() {
  if (shouldResetScreen) {
    currentOperand = "";
    shouldResetScreen = false;
    updateDisplay();
    return;
  }

  if (currentOperand === "Erreur") {
    currentOperand = "";
    updateDisplay();
    return;
  }

  currentOperand = currentOperand.toString().slice(0, -1);
  updateDisplay();
}

function appendNumber(number) {
  if (shouldResetScreen) {
    currentOperand = "";
    shouldResetScreen = false;
  }

  if (number === "." && currentOperand.includes(".")) return;

  currentOperand = currentOperand.toString() + number.toString();
  updateDisplay();
}

async function chooseOperation(op) {
  if (currentOperand === "") {
    if (previousOperand !== "") {
      operation = op;
      updateDisplay();
    }
    return;
  }

  if (previousOperand !== "") {
    await compute();
  }

  operation = op;
  previousOperand = currentOperand;
  currentOperand = "";
  shouldResetScreen = false;
  updateDisplay();
}

async function compute() {
  if (isComputing || !operation) return;

  const prev = Number.parseFloat(previousOperand);
  const current = Number.parseFloat(currentOperand);
  if (Number.isNaN(prev) || Number.isNaN(current)) return;

  setStatus("Calcul en cours...", "ready");

  const prevText = getDisplayNumber(previousOperand);
  const currentText = getDisplayNumber(currentOperand);
  const opSymbol = OPERATION_SYMBOLS[operation] || operation;

  isComputing = true;
  try {
    const params = new URLSearchParams({
      operation,
      a: String(prev),
      b: String(current),
    });

    const response = await fetch(`/api/calculate?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur API");
    }

    currentOperand = data.result.toString();
    addToHistory(`${prevText} ${opSymbol} ${currentText}`, currentOperand);

    operation = undefined;
    previousOperand = "";
    shouldResetScreen = true;
    setStatus(data.cached ? "Résultat en cache" : "Calculé avec succès", data.cached ? "cached" : "ready");
  } catch (error) {
    console.error(error);
    setStatus("Erreur: " + error.message, "error");
    currentOperand = "Erreur";
    previousOperand = "";
    operation = undefined;
    shouldResetScreen = true;
  } finally {
    isComputing = false;
  }

  updateDisplay();
}

function getDisplayNumber(number) {
  const stringNumber = number.toString();
  const [integerPart, decimalDigits] = stringNumber.split(".");
  const integerDigits = Number.parseFloat(integerPart);
  const integerDisplay = Number.isNaN(integerDigits)
    ? ""
    : integerDigits.toLocaleString("fr-FR", { maximumFractionDigits: 0 });

  if (decimalDigits != null) {
    return `${integerDisplay}.${decimalDigits}`;
  }

  return integerDisplay;
}

function updateDisplay() {
  currentOperandTextElement.innerText =
    currentOperand === "Erreur" ? currentOperand : getDisplayNumber(currentOperand) || "0";

  if (operation != null) {
    const opSymbol = OPERATION_SYMBOLS[operation] || operation;
    previousOperandTextElement.innerText = `${getDisplayNumber(previousOperand)} ${opSymbol}`;
    return;
  }

  previousOperandTextElement.innerText = "";
}

function setStatus(text, type) {
  statusText.textContent = " " + text;
  statusDot.className = "dot";

  if (type === "cached") {
    statusDot.classList.add("cached");
  } else if (type === "error") {
    statusDot.classList.add("error");
  }
}

function loadHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_ITEMS) : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

function addToHistory(calculation, result) {
  history.unshift({ calculation, result });
  history = history.slice(0, MAX_HISTORY_ITEMS);
  saveHistory();
  renderHistory();
}

function renderHistory() {
  historyList.replaceChildren();

  if (history.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-history";
    emptyState.textContent = "Aucun calcul récent";
    historyList.appendChild(emptyState);
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const item of history) {
    const historyItem = document.createElement("div");
    const calculation = document.createElement("div");
    const result = document.createElement("div");

    historyItem.className = "history-item";
    calculation.className = "history-item-calc";
    result.className = "history-item-result";

    calculation.textContent = `${item.calculation} =`;
    result.textContent = getDisplayNumber(item.result);

    historyItem.append(calculation, result);
    fragment.appendChild(historyItem);
  }

  historyList.appendChild(fragment);
}
