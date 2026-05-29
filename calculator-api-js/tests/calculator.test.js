const Calculator = require("../src/calculator");

describe("Calculator", () => {
  let calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  describe("add", () => {
    it("devrait retourner 5 pour add(2, 3)", () => {
      expect(calculator.add(2, 3)).toBe(5);
    });

    it.each`
      a      | b      | expected
      ${2}   | ${3}   | ${5}
      ${-5}  | ${-3}  | ${-8}
      ${-5}  | ${3}   | ${-2}
      ${7}   | ${0}   | ${7}
      ${0.1} | ${0.2} | ${0.3}
    `("devrait retourner $a + $b = $expected", ({ a, b, expected }) => {
      expect(calculator.add(a, b)).toBeCloseTo(expected, 2);
    });
  });

  describe("subtract", () => {
    it.each`
      a     | b     | expected
      ${10} | ${4}  | ${6}
      ${3}  | ${10} | ${-7}
      ${5}  | ${0}  | ${5}
      ${-5} | ${-3} | ${-2}
    `("devrait retourner $a - $b = $expected", ({ a, b, expected }) => {
      expect(calculator.subtract(a, b)).toBe(expected);
    });

    it("devrait gérer la précision des flottants avec toBeCloseTo", () => {
      expect(calculator.subtract(0.3, 0.1)).toBeCloseTo(0.2);
    });
  });

  describe("multiply", () => {
    it.each`
      a     | b      | expected
      ${6}  | ${7}   | ${42}
      ${0}  | ${999} | ${0}
      ${-3} | ${-4}  | ${12}
      ${3}  | ${-4}  | ${-12}
    `("devrait retourner $a * $b = $expected", ({ a, b, expected }) => {
      expect(calculator.multiply(a, b)).toBe(expected);
    });

    it("devrait gérer la précision des flottants avec toBeCloseTo", () => {
      expect(calculator.multiply(0.1, 0.2)).toBeCloseTo(0.02);
    });
  });

  describe("divide", () => {
    it.each`
      a      | b     | expected
      ${20}  | ${5}  | ${4}
      ${0}   | ${5}  | ${0}
      ${-10} | ${-2} | ${5}
      ${-7}  | ${2}  | ${-3.5}
    `("devrait retourner $a / $b = $expected", ({ a, b, expected }) => {
      expect(calculator.divide(a, b)).toBe(expected);
    });

    it("devrait gérer la précision des flottants avec toBeCloseTo", () => {
      expect(calculator.divide(10, 3)).toBeCloseTo(3.333);
    });

    it("devrait lever une erreur pour une division par zéro", () => {
      expect(() => calculator.divide(10, 0)).toThrow(
        "Division par zéro impossible.",
      );
    });
  });

  describe("Cas de coercion JS à documenter", () => {
    it("devrait retourner 2 pour add(null, 2) (null est coercé en 0)", () => {
      expect(calculator.add(null, 2)).toBe(2);
    });

    it("devrait retourner NaN pour subtract(undefined, 5) (undefined produit NaN)", () => {
      expect(calculator.subtract(undefined, 5)).toBeNaN();
    });

    it("devrait retourner NaN pour multiply('abc', 3) (chaîne non numérique -> NaN)", () => {
      expect(calculator.multiply("abc", 3)).toBeNaN();
    });

    it("devrait retourner NaN pour divide(NaN, 5) (NaN se propage)", () => {
      expect(calculator.divide(NaN, 5)).toBeNaN();
    });
  });
});
