import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public final class TestRunner {
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(2))
        .build();

    private TestRunner() {
    }

    public static void main(String[] args) throws Exception {
        testCalculatorOperations();
        testCalculatorRejectsDivisionByZero();
        testHttpContractWhenTargetIsConfigured();
        System.out.println("Tests Java OK");
    }

    private static void testCalculatorOperations() {
        Calculator calculator = new Calculator();
        assertEquals(5, calculator.add(2, 3), "add");
        assertEquals(-1, calculator.subtract(2, 3), "subtract");
        assertEquals(6, calculator.multiply(2, 3), "multiply");
        assertEquals(2.5, calculator.divide(5, 2), "divide");
    }

    private static void testCalculatorRejectsDivisionByZero() {
        Calculator calculator = new Calculator();
        try {
            calculator.divide(10, 0);
            throw new AssertionError("divide should reject zero division");
        } catch (IllegalArgumentException error) {
            assertContains(error.getMessage(), "Division par zéro impossible.", "zero division message");
        }
    }

    private static void testHttpContractWhenTargetIsConfigured() throws Exception {
        String baseUrl = System.getenv("TEST_BASE_URL");
        if (baseUrl == null || baseUrl.isBlank()) {
            System.out.println("Tests HTTP ignorés : TEST_BASE_URL absent");
            return;
        }

        HttpResult root = request(baseUrl + "/");
        assertEquals(200, root.statusCode, "root status");
        assertContains(root.body, "Hello from backend-java", "root body");

        long uniqueValue = System.nanoTime() % 1_000_000;
        String addPath = baseUrl + "/calculate?operation=add&a=" + uniqueValue + "&b=3";
        HttpResult add = request(addPath);
        assertEquals(200, add.statusCode, "add status");
        assertContains(add.body, "\"operation\":\"add\"", "add operation");
        assertContains(add.body, "\"result\":" + (uniqueValue + 3), "add result");
        assertContains(add.body, "\"cached\":false", "add cache miss");
        assertEquals("application/json; charset=utf-8", add.contentType, "content-type");
        assertEquals("*", add.corsHeader, "cors header");

        String multiplyPath = baseUrl + "/calculate?operation=multiply&a=" + uniqueValue + "&b=7";
        HttpResult firstMultiply = request(multiplyPath);
        HttpResult secondMultiply = request(multiplyPath);
        assertEquals(200, firstMultiply.statusCode, "first multiply status");
        assertEquals(200, secondMultiply.statusCode, "second multiply status");
        assertContains(firstMultiply.body, "\"cached\":false", "first multiply cache miss");
        assertContains(secondMultiply.body, "\"cached\":true", "second multiply cache hit");

        HttpResult divisionByZero = request(baseUrl + "/calculate?operation=divide&a=10&b=0");
        assertEquals(400, divisionByZero.statusCode, "division by zero status");
        assertContains(divisionByZero.body, "Division par zéro impossible.", "division by zero body");

        HttpResult unknownOperation = request(baseUrl + "/calculate?operation=modulo&a=1&b=2");
        assertEquals(400, unknownOperation.statusCode, "unknown operation status");
        assertContains(unknownOperation.body, "Opération inconnue", "unknown operation body");
    }

    private static HttpResult request(String url) throws Exception {
        Exception lastError = null;
        for (int attempt = 0; attempt < 20; attempt += 1) {
            try {
                HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(2))
                    .GET()
                    .build();
                HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
                return new HttpResult(
                    response.statusCode(),
                    response.body(),
                    response.headers().firstValue("content-type").orElse(""),
                    response.headers().firstValue("access-control-allow-origin").orElse("")
                );
            } catch (IOException | InterruptedException error) {
                lastError = error;
                Thread.sleep(250);
            }
        }
        throw new AssertionError("API indisponible: " + lastError);
    }

    private static void assertEquals(Object expected, Object actual, String label) {
        if (!expected.equals(actual)) {
            throw new AssertionError(label + " expected " + expected + " but got " + actual);
        }
    }

    private static void assertEquals(double expected, double actual, String label) {
        if (Math.abs(expected - actual) > 0.000001) {
            throw new AssertionError(label + " expected " + expected + " but got " + actual);
        }
    }

    private static void assertContains(String actual, String expectedPart, String label) {
        if (!actual.contains(expectedPart)) {
            throw new AssertionError(label + " should contain " + expectedPart + " but got " + actual);
        }
    }

    private record HttpResult(int statusCode, String body, String contentType, String corsHeader) {
    }
}
