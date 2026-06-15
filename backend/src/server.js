const http = require("http");
const url = require("url");
const redis = require("redis");
const Calculator = require("./calculator");

const calculator = new Calculator();
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

const redisClient = redis.createClient({ url: REDIS_URL });
/* istanbul ignore next */
if (process.env.NODE_ENV !== "test") {
  redisClient.on("error", (err) => console.log("Redis Client Error", err));
  redisClient
    .connect()
    .catch(() => console.log("Failed to connect to Redis initially."));
}

const sendResponse = (res, status, body, extraHeaders = {}) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extraHeaders,
  };
  res.writeHead(status, headers);
  if (body !== null && body !== undefined) {
    res.end(JSON.stringify(body));
  } else {
    res.end();
  }
};

const requestHandler = async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  if (req.method === "OPTIONS") {
    return sendResponse(res, 204, null);
  }

  if (req.method !== "GET") {
    return sendResponse(
      res,
      405,
      { error: "Méthode non autorisée. Utiliser GET." },
      {
        Allow: "GET, OPTIONS",
      },
    );
  }

  if (pathname !== "/calculate") {
    return sendResponse(res, 404, { error: "Route introuvable." });
  }

  const op = query.operation;
  const a = query.a;
  const b = query.b;

  if (
    op === undefined ||
    a === undefined ||
    b === undefined ||
    op === "" ||
    a === "" ||
    b === ""
  ) {
    return sendResponse(res, 400, {
      error: "Paramètres attendus : operation, a, b",
    });
  }

  const numA = Number(a);
  const numB = Number(b);

  if (
    Number.isNaN(numA) ||
    Number.isNaN(numB) ||
    a.trim() === "" ||
    b.trim() === ""
  ) {
    return sendResponse(res, 400, {
      error: "Les paramètres a et b doivent être des nombres.",
    });
  }

  const allowedOperations = ["add", "subtract", "multiply", "divide"];
  if (!allowedOperations.includes(op)) {
    return sendResponse(res, 400, {
      error: "Opération inconnue. Utiliser : add, subtract, multiply, divide",
    });
  }

  const cacheKey = `${op}:${numA}:${numB}`;

  try {
    /* istanbul ignore next */
    if (redisClient.isReady) {
      const cachedResult = await redisClient.get(cacheKey);
      if (cachedResult !== null) {
        return sendResponse(res, 200, {
          operation: op,
          a: numA,
          b: numB,
          result: Number(cachedResult),
          cached: true,
        });
      }
    }

    let result;
    switch (op) {
      case "add":
        result = calculator.add(numA, numB);
        break;
      case "subtract":
        result = calculator.subtract(numA, numB);
        break;
      case "multiply":
        result = calculator.multiply(numA, numB);
        break;
      case "divide":
        result = calculator.divide(numA, numB);
        break;
    }

    /* istanbul ignore next */
    if (redisClient.isReady) {
      await redisClient.set(cacheKey, result, { EX: 3600 });
    }

    return sendResponse(res, 200, {
      operation: op,
      a: numA,
      b: numB,
      result: result,
      cached: false,
    });
  } catch (error) {
    return sendResponse(res, 400, { error: error.message });
  }
};

const server = http.createServer(requestHandler);

/* istanbul ignore next */
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
  });
}

module.exports = { requestHandler, server };
