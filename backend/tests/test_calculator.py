import math

import pytest

from src.calculator import Calculator


@pytest.fixture
def calculator():
    return Calculator()


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        (2, 3, 5),
        (-5, -3, -8),
        (-5, 3, -2),
        (7, 0, 7),
        (0.1, 0.2, 0.3),
    ],
)
def test_add(calculator, a, b, expected):
    assert calculator.add(a, b) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        (10, 4, 6),
        (3, 10, -7),
        (5, 0, 5),
        (-5, -3, -2),
        (0.3, 0.1, 0.2),
    ],
)
def test_subtract(calculator, a, b, expected):
    assert calculator.subtract(a, b) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        (6, 7, 42),
        (0, 999, 0),
        (-3, -4, 12),
        (3, -4, -12),
        (0.1, 0.2, 0.02),
    ],
)
def test_multiply(calculator, a, b, expected):
    assert calculator.multiply(a, b) == pytest.approx(expected)


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        (20, 5, 4),
        (0, 5, 0),
        (-10, -2, 5),
        (-7, 2, -3.5),
        (10, 3, 3.3333333333333335),
    ],
)
def test_divide(calculator, a, b, expected):
    assert calculator.divide(a, b) == pytest.approx(expected)


def test_divide_by_zero_raises_value_error(calculator):
    with pytest.raises(ValueError, match="Division par zéro impossible."):
        calculator.divide(10, 0)


def test_nan_is_propagated(calculator):
    assert math.isnan(calculator.divide(math.nan, 5))
