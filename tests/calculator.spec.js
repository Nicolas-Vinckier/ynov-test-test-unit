// @ts-check
import { test, expect } from "@playwright/test";

test.describe("Tests E2E de la Cand'culatrice", () => {
  test.beforeEach(async ({ page }) => {
    // Aller sur la page d'accueil de la calculatrice
    await page.goto("/");
  });

  test("affiche l'interface initiale de la calculatrice", async ({ page }) => {
    // Vérifier le titre de l'application
    await expect(page).toHaveTitle("Cand'culatrice");

    // Vérifier l'état initial de l'affichage
    await expect(page.locator("#current-operand")).toHaveText("0");
    await expect(page.locator("#previous-operand")).toHaveText("");
    await expect(page.locator("#status-bar")).toContainText("Prêt");
  });

  test("gère la saisie locale d'un nombre simple et la remise à zéro", async ({
    page,
  }) => {
    // Cliquer sur des chiffres et un point décimal
    await page.getByRole("button", { name: "7" }).click();
    await page.getByRole("button", { name: "8" }).click();
    await page.getByRole("button", { name: "." }).click();
    await page.getByRole("button", { name: "5" }).click();

    // Vérifier l'affichage temporaire local
    await expect(page.locator("#current-operand")).toHaveText("78.5");

    // Cliquer sur le bouton Clear (AC)
    await page.locator("#clear").click();

    // Vérifier la remise à zéro
    await expect(page.locator("#current-operand")).toHaveText("0");
    await expect(page.locator("#previous-operand")).toHaveText("");
    await expect(page.locator("#status-bar")).toContainText("Prêt");
  });

  test("demande un calcul et affiche le résultat via une API simulée", async ({
    page,
  }) => {
    // Intercepter et simuler l'appel API de calcul
    await page.route("**/api/calculate*", async (route) => {
      const url = new URL(route.request().url());
      const operation = url.searchParams.get("operation");
      const a = url.searchParams.get("a");
      const b = url.searchParams.get("b");

      let result = 0;
      if (operation === "add") {
        result = parseFloat(a || "0") + parseFloat(b || "0");
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result, cached: false }),
      });
    });

    // Simuler le calcul "5 + 3"
    await page.getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: "+" }).click();

    // Vérifier que le premier opérande est mis en haut avec l'opérateur
    await expect(page.locator("#previous-operand")).toHaveText("5 +");

    await page.getByRole("button", { name: "3" }).click();
    await page.locator("#equals").click();

    // Vérifier le résultat final et le statut
    await expect(page.locator("#current-operand")).toHaveText("8");
    await expect(page.locator("#status-bar")).toContainText(
      "Calculé avec succès",
    );
  });

  test("gère les résultats de calcul renvoyés depuis le cache", async ({
    page,
  }) => {
    // Intercepter l'appel et renvoyer un statut cached: true
    await page.route("**/api/calculate*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ result: 15, cached: true }),
      });
    });

    // Simuler un calcul "5 x 3"
    await page.getByRole("button", { name: "5" }).click();
    await page.getByRole("button", { name: "x" }).click();
    await page.getByRole("button", { name: "3" }).click();
    await page.locator("#equals").click();

    // Vérifier le résultat et que le statut indique le cache
    await expect(page.locator("#current-operand")).toHaveText("15");
    await expect(page.locator("#status-bar")).toContainText(
      "Résultat en cache",
    );
    await expect(page.locator(".dot")).toHaveClass(/cached/);
  });


  test("effectue un calcul avec le vrai backend via le gateway", async ({
    page,
  }) => {
    test.skip(
      !process.env.BASE_URL,
      "Ce test nécessite l'application complète lancée par Docker Compose.",
    );

    await page.getByRole("button", { name: "9" }).click();
    await page.getByRole("button", { name: "+" }).click();
    await page.getByRole("button", { name: "4" }).click();
    await page.locator("#equals").click();

    await expect(page.locator("#current-operand")).toHaveText("13");
    await expect(page.locator("#status-bar")).toContainText(/Calculé avec succès|Résultat en cache/);
  });

  test("affiche une erreur lorsque l'API retourne une erreur de calcul", async ({
    page,
  }) => {
    // Intercepter l'appel et renvoyer une erreur 400
    await page.route("**/api/calculate*", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Division par zéro impossible" }),
      });
    });

    // Simuler "9 ÷ 0"
    await page.getByRole("button", { name: "9" }).click();
    await page.getByRole("button", { name: "÷" }).click();
    await page.getByRole("button", { name: "0" }).click();
    await page.locator("#equals").click();

    // Vérifier le comportement en cas d'erreur
    await expect(page.locator("#current-operand")).toHaveText("Erreur");
    await expect(page.locator("#status-bar")).toContainText(
      "Erreur: Division par zéro impossible",
    );
    await expect(page.locator(".dot")).toHaveClass(/error/);
  });
});
