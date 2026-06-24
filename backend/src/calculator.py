"""Logique métier de la calculatrice."""


class Calculator:
    """Expose les quatre opérations arithmétiques supportées par l'API."""

    def add(self, a: float, b: float) -> float:
        return a + b

    def subtract(self, a: float, b: float) -> float:
        return a - b

    def multiply(self, a: float, b: float) -> float:
        return a * b

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ValueError("Division par zéro impossible.")
        return a / b
