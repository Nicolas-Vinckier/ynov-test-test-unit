const http = require("http");
const { requestHandler } = require("../src/server");
const { request } = require("./helpers/http");

describe("API /calculate", () => {
  let server;

  beforeAll((done) => {
    server = http.createServer(requestHandler);
    server.listen(0, "127.0.0.1", done); // port aléatoire
  });

  afterAll((done) => {
    server.close(done);
  });

  describe("Performance", () => {
    it("Une requête valide répond en moins de 100 ms", async () => {
      const { duration } = await request(
        server,
        "/calculate?operation=add&a=1&b=2",
      );
      expect(duration).toBeLessThan(100);
    });

    it("Une requête en erreur 400 répond en moins de 100 ms", async () => {
      const { duration } = await request(
        server,
        "/calculate?operation=add&a=abc&b=2",
      );
      expect(duration).toBeLessThan(100);
    });
  });

  describe("Headers de réponse", () => {
    it("Vérifie les headers sur une réponse 200", async () => {
      const { headers } = await request(
        server,
        "/calculate?operation=add&a=1&b=2",
      );
      expect(headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(headers["access-control-allow-origin"]).toBe("*");
    });

    it("Vérifie les headers sur une réponse 400", async () => {
      const { headers } = await request(
        server,
        "/calculate?operation=add&a=abc",
      );
      expect(headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(headers["access-control-allow-origin"]).toBe("*");
    });

    it("Vérifie les headers sur une réponse 404", async () => {
      const { headers } = await request(server, "/unknown");
      expect(headers["content-type"]).toBe("application/json; charset=utf-8");
      expect(headers["access-control-allow-origin"]).toBe("*");
    });
  });

  describe("OPTIONS /calculate - preflight CORS", () => {
    it("Doit retourner un status 204 avec body null et les bons headers", async () => {
      const { status, body, headers } = await request(
        server,
        "/calculate",
        "OPTIONS",
      );
      expect(status).toBe(204);
      expect(body).toBeNull();
      expect(headers["access-control-allow-origin"]).toBe("*");
      expect(headers["access-control-allow-methods"]).toContain("GET");
    });
  });

  describe("GET /calculate - cas nominaux", () => {
    it.each([
      { operation: "add", a: 2, b: 3, expected: 5 },
      { operation: "subtract", a: 10, b: 4, expected: 6 },
      { operation: "multiply", a: 6, b: 7, expected: 42 },
      { operation: "divide", a: 20, b: 5, expected: 4 },
      { operation: "add", a: -5, b: -3, expected: -8 },
      { operation: "subtract", a: -5, b: -3, expected: -2 },
      { operation: "multiply", a: -3, b: -4, expected: 12 },
      { operation: "divide", a: -10, b: -2, expected: 5 },
    ])(
      "retourne status 200 et le bon résultat pour $operation($a, $b) = $expected",
      async ({ operation, a, b, expected }) => {
        const { status, body } = await request(
          server,
          `/calculate?operation=${operation}&a=${a}&b=${b}`,
        );
        expect(status).toBe(200);
        expect(body).toMatchObject({ operation, a, b, result: expected });
      },
    );

    it("Division décimale : résultat proche de 3.333 avec toBeCloseTo", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=divide&a=10&b=3",
      );
      expect(status).toBe(200);
      expect(body.result).toBeCloseTo(3.333, 3);
    });

    it("Décimaux en query string : body.result === 4", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=add&a=1.5&b=2.5",
      );
      expect(status).toBe(200);
      expect(body.result).toBe(4);
    });

    it("Contrat JSON 200 : contient operation, a, b, result et pas error", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=multiply&a=3&b=4",
      );
      expect(status).toBe(200);
      expect(body).toHaveProperty("operation");
      expect(body).toHaveProperty("a");
      expect(body).toHaveProperty("b");
      expect(body).toHaveProperty("result");
      expect(body).not.toHaveProperty("error");
    });
  });

  describe("Méthode non autorisée", () => {
    it("POST /calculate retourne 405 et un body avec error", async () => {
      const { status, body } = await request(server, "/calculate", "POST");
      expect(status).toBe(405);
      expect(body).toHaveProperty("error");
    });

    it("POST /calculate retourne header allow contenant GET", async () => {
      const { headers } = await request(server, "/calculate", "POST");
      expect(headers["allow"]).toContain("GET");
    });

    it("PUT /calculate retourne 405", async () => {
      const { status } = await request(server, "/calculate", "PUT");
      expect(status).toBe(405);
    });
  });

  describe("GET /calculate - erreurs 400", () => {
    const errorParamMissing = /Paramètres attendus/;
    const errorNotNumber = /doivent être des nombres/;

    it.each([
      {
        name: "b manquant",
        url: "/calculate?operation=add&a=2",
        matchError: errorParamMissing,
      },
      {
        name: "a manquant",
        url: "/calculate?operation=add&b=2",
        matchError: errorParamMissing,
      },
      {
        name: "a non numérique",
        url: "/calculate?operation=add&a=abc&b=3",
        matchError: errorNotNumber,
      },
      {
        name: "b non numérique",
        url: "/calculate?operation=add&a=3&b=abc",
        matchError: errorNotNumber,
      },
      {
        name: "Opération inconnue",
        url: "/calculate?operation=modulo&a=10&b=3",
        matchError: /Opération inconnue/,
      },
      {
        name: "operation absent",
        url: "/calculate?a=5&b=3",
        matchError: errorParamMissing,
      },
    ])("retourne 400 pour $name", async ({ url, matchError }) => {
      const { status, body } = await request(server, url);
      expect(status).toBe(400);
      expect(body.error).toMatch(matchError);
    });

    it("Division par zéro retourne status 400 et message exact", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=divide&a=10&b=0",
      );
      expect(status).toBe(400);
      expect(body.error).toBe("Division par zéro impossible.");
    });

    it("Contrat JSON erreur", async () => {
      const { body } = await request(server, "/calculate?operation=add&a=2");
      expect(body).toHaveProperty("error");
      expect(body).not.toHaveProperty("result");
    });
  });

  describe("GET - autres routes", () => {
    it("Route inconnue", async () => {
      const { status, body } = await request(server, "/unknown");
      expect(status).toBe(404);
      expect(body.error).toBe("Route introuvable.");
    });

    it("Racine", async () => {
      const { status, body } = await request(server, "/");
      expect(status).toBe(404);
      expect(body).toHaveProperty("error");
    });

    it("Slash final", async () => {
      const { status, body } = await request(server, "/calculate/");
      expect(status).toBe(404);
      expect(body).toHaveProperty("error");
    });
  });

  describe("Cas limites - edge cases", () => {
    it("Très grande valeur", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=add&a=1e308&b=1e308",
      );
      expect(status).toBe(200);
      expect([null, "Infinity", Infinity]).toContain(body.result);
    });

    it("a=-0", async () => {
      const { status, body } = await request(
        server,
        "/calculate?operation=add&a=-0&b=5",
      );
      expect(status).toBe(200);
      expect(body.result).toBe(5);
      expect(body.a).toBe(0);
    });
  });
});
