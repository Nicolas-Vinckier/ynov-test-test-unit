import "./style.css";

const currentOperandTextElement = document.getElementById("current-operand");
const previousOperandTextElement = document.getElementById("previous-operand");
const statusDot = document.querySelector(".dot");
const statusText = document.querySelector(".status-bar").lastChild;

// New elements for enhanced UI features
const historyDrawer = document.getElementById("history-drawer");
const historyToggle = document.getElementById("history-toggle");
const historyClose = document.getElementById("history-close");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");
const themeToggle = document.getElementById("theme-toggle");

// Load and apply saved theme preference
const savedTheme = localStorage.getItem("theme") || "dark";
if (savedTheme === "light") {
  document.body.classList.add("light-theme");
}

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light-theme");
  const currentTheme = document.body.classList.contains("light-theme") ? "light" : "dark";
  localStorage.setItem("theme", currentTheme);
});

let currentOperand = "";
let previousOperand = "";
let operation = undefined;
let shouldResetScreen = false;
let history = JSON.parse(localStorage.getItem("calc_history") || "[]");

const buttons = document.querySelectorAll(".btn");

const isTest = navigator.webdriver;
if (isTest) {
  document.body.classList.add("is-test");
}

// Initialize History UI
renderHistory();

// Event listeners for basic functionality & visual feedback
buttons.forEach((button) => {
  button.addEventListener("click", (e) => {
    if (!isTest) {
      // 1. Dynamic Ripple Effect
      createRipple(e, button);

      // 2. Trigger active pop effect on display
      triggerDisplayPop();
    }

    // 3. Process action
    if (button.hasAttribute("data-num")) {
      appendNumber(button.getAttribute("data-num"));
    } else if (button.hasAttribute("data-op")) {
      chooseOperation(button.getAttribute("data-op"));
    } else if (button.id === "clear") {
      clear();
    } else if (button.id === "equals") {
      compute();
    }
  });
});

// History drawer toggle events
historyToggle.addEventListener("click", () => {
  historyDrawer.classList.add("open");
});

historyClose.addEventListener("click", () => {
  historyDrawer.classList.remove("open");
});

clearHistoryBtn.addEventListener("click", () => {
  history = [];
  localStorage.setItem("calc_history", JSON.stringify(history));
  renderHistory();
});

// Click Ripple helper
function createRipple(event, button) {
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  const rect = button.getBoundingClientRect();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add("ripple");

  const ripple = button.getElementsByClassName("ripple")[0];

  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
}

// Display Pop animation helper
function triggerDisplayPop() {
  currentOperandTextElement.classList.remove("pop-effect");
  void currentOperandTextElement.offsetWidth; // Trigger reflow to restart animation
  currentOperandTextElement.classList.add("pop-effect");
}

function clear() {
  currentOperand = "";
  previousOperand = "";
  operation = undefined;
  shouldResetScreen = false;
  updateDisplay();
  setStatus("Prêt", "ready");
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

function chooseOperation(op) {
  if (currentOperand === "") return;
  if (previousOperand !== "") {
    return;
  }
  operation = op;
  previousOperand = currentOperand;
  currentOperand = "";
  shouldResetScreen = false;
  updateDisplay();
}

async function compute() {
  let computation;
  const prev = parseFloat(previousOperand);
  const current = parseFloat(currentOperand);
  if (isNaN(prev) || isNaN(current)) return;
  if (!operation) return;

  setStatus("Calcul en cours...", "ready");

  const prevText = getDisplayNumber(previousOperand);
  let opSymbol = "";
  switch (operation) {
    case "add": opSymbol = "+"; break;
    case "subtract": opSymbol = "-"; break;
    case "multiply": opSymbol = "x"; break;
    case "divide": opSymbol = "÷"; break;
  }
  const currentText = getDisplayNumber(currentOperand);

  try {
    const response = await fetch(
      `/api/calculate?operation=${operation}&a=${prev}&b=${current}`,
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur API");
    }

    currentOperand = data.result.toString();
    
    // Save to history
    addToHistory(`${prevText} ${opSymbol} ${currentText}`, currentOperand);

    operation = undefined;
    previousOperand = "";
    shouldResetScreen = true;

    if (data.cached) {
      setStatus("Résultat en cache", "cached");
    } else {
      setStatus("Calculé avec succès", "ready");
    }
  } catch (error) {
    console.error(error);
    setStatus("Erreur: " + error.message, "error");
    currentOperand = "Erreur";
    previousOperand = "";
    operation = undefined;
    shouldResetScreen = true;
  }

  updateDisplay();
}

function getDisplayNumber(number) {
  const stringNumber = number.toString();
  const integerDigits = parseFloat(stringNumber.split(".")[0]);
  const decimalDigits = stringNumber.split(".")[1];
  let integerDisplay;
  if (isNaN(integerDigits)) {
    integerDisplay = "";
  } else {
    integerDisplay = integerDigits.toLocaleString("fr-FR", {
      maximumFractionDigits: 0,
    });
  }
  if (decimalDigits != null) {
    return `${integerDisplay}.${decimalDigits}`;
  } else {
    return integerDisplay;
  }
}

function updateDisplay() {
  if (currentOperand === "Erreur") {
    currentOperandTextElement.innerText = currentOperand;
  } else {
    currentOperandTextElement.innerText = getDisplayNumber(currentOperand);
  }

  if (operation != null) {
    let opSymbol = operation;
    switch (operation) {
      case "add":
        opSymbol = "+";
        break;
      case "subtract":
        opSymbol = "-";
        break;
      case "multiply":
        opSymbol = "x";
        break;
      case "divide":
        opSymbol = "÷";
        break;
    }
    previousOperandTextElement.innerText = `${getDisplayNumber(previousOperand)} ${opSymbol}`;
  } else {
    previousOperandTextElement.innerText = "";
  }
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

// History Functions
function addToHistory(calculation, result) {
  history.unshift({ calculation, result });
  // Keep last 20 entries
  if (history.length > 20) {
    history.pop();
  }
  localStorage.setItem("calc_history", JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    historyList.innerHTML = '<div class="empty-history">Aucun calcul récent</div>';
    return;
  }

  historyList.innerHTML = history
    .map(
      (item) => `
      <div class="history-item">
        <div class="history-item-calc">${item.calculation} =</div>
        <div class="history-item-result">${getDisplayNumber(item.result)}</div>
      </div>
    `
    )
    .join("");
}
