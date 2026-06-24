import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.function.BiFunction;

public final class App {
    private static final Calculator CALCULATOR = new Calculator();
    private static final Map<String, String> CACHE = new ConcurrentHashMap<>();
    private static final Map<String, BiFunction<Double, Double, Double>> OPERATIONS = Map.of(
        "add", CALCULATOR::add,
        "subtract", CALCULATOR::subtract,
        "multiply", CALCULATOR::multiply,
        "divide", CALCULATOR::divide
    );

    private App() {
    }

    public static void main(String[] args) throws IOException {
        int port = parsePort(System.getenv().getOrDefault("PORT", "3000"));
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.createContext("/", new ApiHandler());
        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();
        System.out.printf("Backend Java démarré sur http://0.0.0.0:%d%n", port);
    }

    private static int parsePort(String rawPort) {
        try {
            return Integer.parseInt(rawPort);
        } catch (NumberFormatException error) {
            return 3000;
        }
    }

    private static final class ApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                sendResponse(exchange, 204, "");
                return;
            }

            if (!"GET".equals(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().set("Allow", "GET, OPTIONS");
                sendResponse(exchange, 405, errorJson("Méthode non autorisée. Utiliser GET."));
                return;
            }

            URI uri = exchange.getRequestURI();
            String path = uri.getPath();

            if ("/".equals(path)) {
                sendResponse(exchange, 200, "{\"message\":\"Hello from backend-java\"}");
                return;
            }

            if (!"/calculate".equals(path)) {
                sendResponse(exchange, 404, errorJson("Route introuvable."));
                return;
            }

            handleCalculate(exchange, uri);
        }

        private void handleCalculate(HttpExchange exchange, URI uri) throws IOException {
            Map<String, String> query = QueryParser.parse(uri.getRawQuery());
            String operationName = query.get("operation");
            String rawA = query.get("a");
            String rawB = query.get("b");

            if (isMissing(operationName) || isMissing(rawA) || isMissing(rawB)) {
                sendResponse(exchange, 400, errorJson("Paramètres attendus : operation, a, b"));
                return;
            }

            Double a = parseNumber(rawA);
            Double b = parseNumber(rawB);
            if (a == null || b == null) {
                sendResponse(exchange, 400, errorJson("Les paramètres a et b doivent être des nombres."));
                return;
            }

            BiFunction<Double, Double, Double> operation = OPERATIONS.get(operationName);
            if (operation == null) {
                sendResponse(exchange, 400, errorJson("Opération inconnue. Utiliser : add, subtract, multiply, divide"));
                return;
            }

            String cacheKey = operationName + ":" + formatNumber(a) + ":" + formatNumber(b);
            String cachedResult = CACHE.get(cacheKey);
            if (cachedResult != null) {
                sendResponse(exchange, 200, calculateJson(operationName, a, b, cachedResult, true));
                return;
            }

            try {
                double result = operation.apply(a, b);
                String formattedResult = formatNumber(result);
                CACHE.put(cacheKey, formattedResult);
                sendResponse(exchange, 200, calculateJson(operationName, a, b, formattedResult, false));
            } catch (IllegalArgumentException error) {
                sendResponse(exchange, 400, errorJson(error.getMessage()));
            }
        }
    }

    private static boolean isMissing(String value) {
        return value == null || value.isEmpty();
    }

    private static Double parseNumber(String rawValue) {
        if (rawValue == null || rawValue.trim().isEmpty()) {
            return null;
        }
        try {
            double value = Double.parseDouble(rawValue.trim());
            if (!Double.isFinite(value)) {
                return null;
            }
            return value;
        } catch (NumberFormatException error) {
            return null;
        }
    }

    private static String calculateJson(String operation, double a, double b, String result, boolean cached) {
        return "{"
            + "\"operation\":\"" + escapeJson(operation) + "\","
            + "\"a\":" + formatNumber(a) + ","
            + "\"b\":" + formatNumber(b) + ","
            + "\"result\":" + result + ","
            + "\"cached\":" + cached
            + "}";
    }

    private static String errorJson(String message) {
        return "{\"error\":\"" + escapeJson(message) + "\"}";
    }

    private static String formatNumber(double value) {
        if (value == 0) {
            return "0";
        }
        if (Double.isFinite(value) && Math.rint(value) == value && value <= Long.MAX_VALUE && value >= Long.MIN_VALUE) {
            return Long.toString((long) value);
        }
        return Double.toString(value);
    }

    private static String escapeJson(String value) {
        return value
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\b", "\\b")
            .replace("\f", "\\f")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    private static void sendResponse(HttpExchange exchange, int status, String body) throws IOException {
        byte[] payload = body.getBytes(StandardCharsets.UTF_8);
        Headers headers = exchange.getResponseHeaders();
        headers.set("Content-Type", "application/json; charset=utf-8");
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (status == 204) {
            exchange.sendResponseHeaders(status, -1);
            exchange.close();
            return;
        }

        exchange.sendResponseHeaders(status, payload.length);
        try (OutputStream outputStream = exchange.getResponseBody()) {
            outputStream.write(payload);
        }
    }

    private static final class QueryParser {
        private QueryParser() {
        }

        static Map<String, String> parse(String rawQuery) {
            Map<String, String> values = new ConcurrentHashMap<>();
            if (rawQuery == null || rawQuery.isEmpty()) {
                return values;
            }

            for (String part : rawQuery.split("&")) {
                String[] keyValue = part.split("=", 2);
                String key = decode(keyValue[0]);
                String value = keyValue.length > 1 ? decode(keyValue[1]) : "";
                values.put(key, value);
            }
            return values;
        }

        private static String decode(String value) {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        }
    }
}
