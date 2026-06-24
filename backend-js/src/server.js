const http = require("http");
const { URL } = require("url");
const redis = require("redis");
const Calculator = require("./calculator");

const calculator = new Calculator();
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";
const CACHE_TTL_SECONDS = 3600;

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const OPERATIONS = Object.freeze(
  Object.assign(Object.create(null), {
    add: (a, b) => calculator.add(a, b),
    subtract: (a, b) => calculator.subtract(a, b),
    multiply: (a, b) => calculator.multiply(a, b),
    divide: (a, b) => calculator.divide(a, b),
  }),
);

const redisClient = redis.createClient({ url: REDIS_URL });
/* istanbul ignore next */
if (process.env.NODE_ENV !== "test") {
  redisClient.on("error", (err) => console.error("Redis Client Error", err));
  redisClient
    .connect()
    .catch(() => console.error("Failed to connect to Redis initially."));
}

const sendResponse = (res, status, body, extraHeaders = {}) => {
  res.writeHead(status, { ...BASE_HEADERS, ...extraHeaders });
  if (body === null || body === undefined) {
    res.end();
    return;
  }
  res.end(JSON.stringify(body));
};

const isMissingParameter = (value) => value === null || value === "";

const requestHandler = async (req, res) => {
  const parsedUrl = new URL(req.url, "http://localhost");
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.searchParams;

  if (req.method === "OPTIONS") {
    return sendResponse(res, 204, null);
  }

  if (req.method !== "GET") {
    return sendResponse(
      res,
      405,
      { error: "Méthode non autorisée. Utiliser GET." },
      { Allow: "GET, OPTIONS" },
    );
  }

  if (pathname === "/") {
    return sendResponse(res, 200, { message: "Hello from backend-js" });
  }

  if (pathname !== "/calculate") {
    return sendResponse(res, 404, { error: "Route introuvable." });
  }

  const op = query.get("operation");
  const a = query.get("a");
  const b = query.get("b");

  if (isMissingParameter(op) || isMissingParameter(a) || isMissingParameter(b)) {
    return sendResponse(res, 400, {
      error: "Paramètres attendus : operation, a, b",
    });
  }

  const numA = Number(a);
  const numB = Number(b);

  if (Number.isNaN(numA) || Number.isNaN(numB) || a.trim() === "" || b.trim() === "") {
    return sendResponse(res, 400, {
      error: "Les paramètres a et b doivent être des nombres.",
    });
  }

  const operation = OPERATIONS[op];
  if (!operation) {
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

    const result = operation(numA, numB);

    /* istanbul ignore next */
    if (redisClient.isReady) {
      await redisClient.set(cacheKey, String(result), { EX: CACHE_TTL_SECONDS });
    }

    return sendResponse(res, 200, {
      operation: op,
      a: numA,
      b: numB,
      result,
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
