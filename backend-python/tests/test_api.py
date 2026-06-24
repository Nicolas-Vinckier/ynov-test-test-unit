import time

import pytest

from src.app import create_app


@pytest.fixture
def client():
    app = create_app({"TESTING": True})
    return app.test_client()


def get_json(client, path, method="GET"):
    start = time.perf_counter()
    response = client.open(path, method=method)
    duration_ms = (time.perf_counter() - start) * 1000
    body = response.get_json(silent=True)
    return response, body, duration_ms


def test_valid_request_responds_under_100_ms(client):
    _, _, duration = get_json(client, "/calculate?operation=add&a=1&b=2")
    assert duration < 100


def test_bad_request_responds_under_100_ms(client):
    _, _, duration = get_json(client, "/calculate?operation=add&a=abc&b=2")
    assert duration < 100


@pytest.mark.parametrize(
    "path",
    [
        "/calculate?operation=add&a=1&b=2",
        "/calculate?operation=add&a=abc",
        "/unknown",
    ],
)
def test_json_and_cors_headers(client, path):
    response, _, _ = get_json(client, path)
    assert response.headers["content-type"] == "application/json; charset=utf-8"
    assert response.headers["access-control-allow-origin"] == "*"


def test_options_preflight(client):
    response, body, _ = get_json(client, "/calculate", "OPTIONS")
    assert response.status_code == 204
    assert body is None
    assert response.headers["access-control-allow-origin"] == "*"
    assert "GET" in response.headers["access-control-allow-methods"]


@pytest.mark.parametrize("method", ["POST", "PUT"])
def test_method_not_allowed(client, method):
    response, body, _ = get_json(client, "/calculate", method)
    assert response.status_code == 405
    assert "error" in body
    assert "GET" in response.headers["allow"]


@pytest.mark.parametrize("path", ["/unknown", "/calculate/"])
def test_unknown_routes(client, path):
    response, body, _ = get_json(client, path)
    assert response.status_code == 404
    assert body["error"] == "Route introuvable."


def test_root_route_returns_backend_identity(client):
    response, body, _ = get_json(client, "/")
    assert response.status_code == 200
    assert body == {"message": "Hello from backend-python"}


@pytest.mark.parametrize(
    ("operation", "a", "b", "expected"),
    [
        ("add", 2, 3, 5),
        ("subtract", 10, 4, 6),
        ("multiply", 6, 7, 42),
        ("divide", 20, 5, 4),
        ("add", -5, -3, -8),
        ("subtract", -5, -3, -2),
        ("multiply", -3, -4, 12),
        ("divide", -10, -2, 5),
        ("multiply", 9, 5, 45),
        ("add", 12, 8, 20),
        ("divide", 81, 9, 9),
        ("subtract", 50, 17, 33),
        ("add", -12, 7, -5),
        ("multiply", -8, 6, -48),
        ("subtract", 3, 10, -7),
        ("divide", 45, -5, -9),
    ],
)
def test_nominal_calculations(client, operation, a, b, expected):
    response, body, _ = get_json(client, f"/calculate?operation={operation}&a={a}&b={b}")
    assert response.status_code == 200
    assert body == {
        "operation": operation,
        "a": a,
        "b": b,
        "result": expected,
        "cached": False,
    }


def test_decimal_division(client):
    response, body, _ = get_json(client, "/calculate?operation=divide&a=10&b=3")
    assert response.status_code == 200
    assert body["result"] == pytest.approx(3.333, rel=1e-3)


def test_decimal_query_parameters(client):
    response, body, _ = get_json(client, "/calculate?operation=add&a=1.5&b=2.5")
    assert response.status_code == 200
    assert body["result"] == 4


def test_success_contract(client):
    response, body, _ = get_json(client, "/calculate?operation=multiply&a=3&b=4")
    assert response.status_code == 200
    assert {"operation", "a", "b", "result", "cached"}.issubset(body.keys())
    assert "error" not in body


@pytest.mark.parametrize(
    ("name", "url", "match_error"),
    [
        ("b manquant", "/calculate?operation=add&a=2", "Paramètres attendus"),
        ("a manquant", "/calculate?operation=add&b=2", "Paramètres attendus"),
        ("a non numérique", "/calculate?operation=add&a=abc&b=3", "doivent être des nombres"),
        ("b non numérique", "/calculate?operation=add&a=3&b=abc", "doivent être des nombres"),
        ("opération inconnue", "/calculate?operation=modulo&a=10&b=3", "Opération inconnue"),
        ("operation absent", "/calculate?a=5&b=3", "Paramètres attendus"),
        ("a vide", "/calculate?operation=add&a=&b=3", "Paramètres attendus"),
        ("b blanc", "/calculate?operation=add&a=3&b=%20", "doivent être des nombres"),
    ],
)
def test_bad_requests(client, name, url, match_error):
    response, body, _ = get_json(client, url)
    assert response.status_code == 400, name
    assert match_error in body["error"]


def test_division_by_zero(client):
    response, body, _ = get_json(client, "/calculate?operation=divide&a=10&b=0")
    assert response.status_code == 400
    assert body["error"] == "Division par zéro impossible."


def test_error_contract(client):
    _, body, _ = get_json(client, "/calculate?operation=add&a=2")
    assert "error" in body
    assert "result" not in body


def test_large_value_serializes_like_json_stringify(client):
    response, body, _ = get_json(client, "/calculate?operation=add&a=1e308&b=1e308")
    assert response.status_code == 200
    assert body["result"] is None


def test_negative_zero_is_serialized_as_zero(client):
    response, body, _ = get_json(client, "/calculate?operation=add&a=-0&b=5")
    assert response.status_code == 200
    assert body["a"] == 0
    assert body["result"] == 5
