<?php

declare(strict_types=1);

require_once __DIR__ . '/Calculator.php';

const CACHE_DIR = '/tmp/backend-php-cache';

$calculator = new Calculator();
$operations = [
    'add' => static fn (float $a, float $b): float => $calculator->add($a, $b),
    'subtract' => static fn (float $a, float $b): float => $calculator->subtract($a, $b),
    'multiply' => static fn (float $a, float $b): float => $calculator->multiply($a, $b),
    'divide' => static fn (float $a, float $b): float => $calculator->divide($a, $b),
];

function send_json(int $status, ?array $body, array $extraHeaders = []): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    foreach ($extraHeaders as $name => $value) {
        header($name . ': ' . $value);
    }

    if ($body !== null) {
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}

function error_response(int $status, string $message): void
{
    send_json($status, ['error' => $message]);
}

function is_missing(?string $value): bool
{
    return $value === null || $value === '';
}

function parse_number(?string $value): ?float
{
    if ($value === null || trim($value) === '') {
        return null;
    }

    if (!is_numeric(trim($value))) {
        return null;
    }

    $number = (float) trim($value);
    if (!is_finite($number)) {
        return null;
    }

    return $number;
}

function normalize_number(float $value): int|float
{
    if ($value == 0.0) {
        return 0;
    }

    if (floor($value) == $value && $value <= PHP_INT_MAX && $value >= PHP_INT_MIN) {
        return (int) $value;
    }

    return $value;
}

function cache_file(string $cacheKey): string
{
    if (!is_dir(CACHE_DIR)) {
        mkdir(CACHE_DIR, 0777, true);
    }

    return CACHE_DIR . '/' . sha1($cacheKey) . '.json';
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($method === 'OPTIONS') {
    send_json(204, null);
    return;
}

if ($method !== 'GET') {
    send_json(405, ['error' => 'Méthode non autorisée. Utiliser GET.'], ['Allow' => 'GET, OPTIONS']);
    return;
}

if ($path === '/') {
    send_json(200, ['message' => 'Hello from backend-php']);
    return;
}

if ($path !== '/calculate') {
    error_response(404, 'Route introuvable.');
    return;
}

$operationName = $_GET['operation'] ?? null;
$rawA = $_GET['a'] ?? null;
$rawB = $_GET['b'] ?? null;

if (is_missing($operationName) || is_missing($rawA) || is_missing($rawB)) {
    error_response(400, 'Paramètres attendus : operation, a, b');
    return;
}

$a = parse_number($rawA);
$b = parse_number($rawB);

if ($a === null || $b === null) {
    error_response(400, 'Les paramètres a et b doivent être des nombres.');
    return;
}

if (!array_key_exists($operationName, $operations)) {
    error_response(400, 'Opération inconnue. Utiliser : add, subtract, multiply, divide');
    return;
}

$cacheKey = $operationName . ':' . normalize_number($a) . ':' . normalize_number($b);
$cacheFile = cache_file($cacheKey);

if (is_file($cacheFile)) {
    $cachedPayload = json_decode((string) file_get_contents($cacheFile), true);
    if (is_array($cachedPayload) && array_key_exists('result', $cachedPayload)) {
        send_json(200, [
            'operation' => $operationName,
            'a' => normalize_number($a),
            'b' => normalize_number($b),
            'result' => normalize_number((float) $cachedPayload['result']),
            'cached' => true,
        ]);
        return;
    }
}

try {
    $result = $operations[$operationName]($a, $b);
} catch (InvalidArgumentException $error) {
    error_response(400, $error->getMessage());
    return;
}

file_put_contents($cacheFile, json_encode(['result' => $result], JSON_THROW_ON_ERROR));

send_json(200, [
    'operation' => $operationName,
    'a' => normalize_number($a),
    'b' => normalize_number($b),
    'result' => normalize_number($result),
    'cached' => false,
]);
