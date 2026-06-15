import "./style.css";

const currentOperandTextElement = document.getElementById("current-operand");
const previousOperandTextElement = document.getElementById("previous-operand");
const statusDot = document.querySelector(".dot");
const statusText = document.querySelector(".status-bar").lastChild;

let currentOperand = "";
let previousOperand = "";
let operation = undefined;
let shouldResetScreen = false;

const buttons = document.querySelectorAll(".btn");

buttons.forEach((button) => {
  button.addEventListener("click", () => {
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

  try {
    const response = await fetch(
      `/api/calculate?operation=${operation}&a=${prev}&b=${current}`,
    );
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur API");
    }

    currentOperand = data.result.toString();
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
