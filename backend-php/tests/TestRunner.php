<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Calculator.php';

function assert_equals(mixed $expected, mixed $actual, string $label): void
{
    if ($expected !== $actual) {
        throw new RuntimeException($label . ' expected ' . var_export($expected, true) . ' but got ' . var_export($actual, true));
    }
}

function assert_float_equals(float $expected, float $actual, string $label): void
{
    if (abs($expected - $actual) > 0.000001) {
        throw new RuntimeException($label . ' expected ' . $expected . ' but got ' . $actual);
    }
}

function assert_contains(string $haystack, string $needle, string $label): void
{
    if (!str_contains($haystack, $needle)) {
        throw new RuntimeException($label . ' should contain ' . $needle . ' but got ' . $haystack);
    }
}

function request_json(string $url): array
{
    $lastError = null;

    for ($attempt = 0; $attempt < 20; $attempt += 1) {
        $http_response_header = [];
        $context = stream_context_create([
            'http' => [
                'ignore_errors' => true,
                'timeout' => 2,
            ],
        ]);

        $body = @file_get_contents($url, false, $context);
        if ($body !== false && isset($http_response_header[0])) {
            preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches);
            $status = isset($matches[1]) ? (int) $matches[1] : 0;
            $headers = [];
            foreach ($http_response_header as $headerLine) {
                if (str_contains($headerLine, ':')) {
                    [$name, $value] = explode(':', $headerLine, 2);
                    $headers[strtolower(trim($name))] = trim($value);
                }
            }
            return [
                'status' => $status,
                'headers' => $headers,
                'bodyRaw' => $body,
                'body' => json_decode($body, true, flags: JSON_THROW_ON_ERROR),
            ];
        }

        $lastError = error_get_last();
        usleep(250000);
    }

    throw new RuntimeException('API indisponible sur ' . $url . ': ' . var_export($lastError, true));
}

function test_calculator_operations(): void
{
    $calculator = new Calculator();
    assert_float_equals(5, $calculator->add(2, 3), 'add');
    assert_float_equals(-1, $calculator->subtract(2, 3), 'subtract');
    assert_float_equals(6, $calculator->multiply(2, 3), 'multiply');
    assert_float_equals(2.5, $calculator->divide(5, 2), 'divide');
}

function test_calculator_rejects_division_by_zero(): void
{
    $calculator = new Calculator();
    try {
        $calculator->divide(10, 0);
        throw new RuntimeException('divide should reject zero division');
    } catch (InvalidArgumentException $error) {
        assert_contains($error->getMessage(), 'Division par zéro impossible.', 'zero division message');
    }
}

function test_http_contract_when_target_is_configured(): void
{
    $baseUrl = getenv('TEST_BASE_URL');
    if ($baseUrl === false || trim($baseUrl) === '') {
        echo "Tests HTTP ignorés : TEST_BASE_URL absent\n";
        return;
    }

    $root = request_json($baseUrl . '/');
    assert_equals(200, $root['status'], 'root status');
    assert_equals(['message' => 'Hello from backend-php'], $root['body'], 'root body');

    $uniqueValue = hrtime(true) % 1000000;
    $add = request_json($baseUrl . '/calculate?operation=add&a=' . $uniqueValue . '&b=3');
    assert_equals(200, $add['status'], 'add status');
    assert_equals('add', $add['body']['operation'], 'add operation');
    assert_equals($uniqueValue + 3, $add['body']['result'], 'add result');
    assert_equals(false, $add['body']['cached'], 'add cache miss');
    assert_equals('application/json; charset=utf-8', $add['headers']['content-type'] ?? '', 'content-type');
    assert_equals('*', $add['headers']['access-control-allow-origin'] ?? '', 'cors header');

    $path = $baseUrl . '/calculate?operation=multiply&a=' . $uniqueValue . '&b=7';
    $firstMultiply = request_json($path);
    $secondMultiply = request_json($path);
    assert_equals(200, $firstMultiply['status'], 'first multiply status');
    assert_equals(200, $secondMultiply['status'], 'second multiply status');
    assert_equals(false, $firstMultiply['body']['cached'], 'first multiply cache miss');
    assert_equals(true, $secondMultiply['body']['cached'], 'second multiply cache hit');

    $divisionByZero = request_json($baseUrl . '/calculate?operation=divide&a=10&b=0');
    assert_equals(400, $divisionByZero['status'], 'division by zero status');
    assert_equals(['error' => 'Division par zéro impossible.'], $divisionByZero['body'], 'division by zero body');

    $unknownOperation = request_json($baseUrl . '/calculate?operation=modulo&a=1&b=2');
    assert_equals(400, $unknownOperation['status'], 'unknown operation status');
    assert_contains($unknownOperation['bodyRaw'], 'Opération inconnue', 'unknown operation body');
}

test_calculator_operations();
test_calculator_rejects_division_by_zero();
test_http_contract_when_target_is_configured();

echo "Tests PHP OK\n";
