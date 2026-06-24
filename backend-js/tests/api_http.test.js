const http = require("http");
const { URL } = require("url");

const TEST_BASE_URL = process.env.TEST_BASE_URL;
const describeIfHttpTarget = TEST_BASE_URL ? describe : describe.skip;

function getJson(path, method = "GET") {
  return new Promise((resolve, reject) => {
    const target = new URL(path, TEST_BASE_URL);
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        });
      },
    );

    req.setTimeout(2000, () => {
      req.destroy(new Error("Timeout HTTP vers le backend de test"));
    });
    req.on("error", reject);
    req.end();
  });
}

describeIfHttpTarget("API HTTP cible Docker", () => {
  it("répond au contrat nominal de /calculate", async () => {
    const response = await getJson("/calculate?operation=add&a=1&b=2");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      operation: "add",
      a: 1,
      b: 2,
      result: 3,
    });
    expect(response.body).toHaveProperty("cached");
  });

  it("retourne une erreur 400 pour une opération inconnue", async () => {
    const response = await getJson("/calculate?operation=modulo&a=1&b=2");

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Opération inconnue");
  });

  it("expose les headers JSON et CORS", async () => {
    const response = await getJson("/calculate?operation=multiply&a=3&b=4");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers["access-control-allow-origin"]).toBe("*");
  });
});
