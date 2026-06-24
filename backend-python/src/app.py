"""Application Flask exposant l'API /calculate."""

from __future__ import annotations

import json
import math
import os
from collections.abc import Callable
from typing import Any

from flask import Flask, Response, current_app, request

from .calculator import Calculator

try:
    import redis
    from redis import RedisError
except ImportError:
    redis = None
    RedisError = Exception

CACHE_TTL_SECONDS = 3600
BASE_HEADERS = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

calculator = Calculator()
OPERATIONS: dict[str, Callable[[float, float], float]] = {
    "add": calculator.add,
    "subtract": calculator.subtract,
    "multiply": calculator.multiply,
    "divide": calculator.divide,
}


def normalize_number(value: Any) -> Any:
    """Produit une sérialisation proche de JSON.stringify(Number)."""
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        if value == 0:
            return 0
        if value.is_integer():
            return int(value)
    return value


def normalize_payload(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: normalize_payload(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize_payload(item) for item in value]
    return normalize_number(value)


def json_response(
    status: int,
    body: dict[str, Any] | None,
    extra_headers: dict[str, str] | None = None,
) -> Response:
    payload = (
        ""
        if body is None
        else json.dumps(
            normalize_payload(body), ensure_ascii=False, separators=(",", ":")
        )
    )
    response = Response(payload, status=status)
    for header, value in BASE_HEADERS.items():
        response.headers[header] = value
    if extra_headers:
        for header, value in extra_headers.items():
            response.headers[header] = value
    return response


def parse_number(raw_value: str) -> float | None:
    if raw_value.strip() == "":
        return None
    try:
        return float(raw_value)
    except ValueError:
        return None


def cache_part(value: float) -> str:
    normalized = normalize_number(value)
    return str(normalized)


def get_redis_client() -> Any | None:
    if not current_app.config.get("REDIS_ENABLED", True):
        return None

    if "redis_client" in current_app.extensions:
        return current_app.extensions["redis_client"]

    if redis is None:
        current_app.extensions["redis_client"] = None
        return None

    try:
        client = redis.Redis.from_url(
            current_app.config["REDIS_URL"],
            decode_responses=True,
            socket_connect_timeout=0.2,
            socket_timeout=0.2,
        )
        client.ping()
    except (RedisError, OSError):
        client = None

    current_app.extensions["redis_client"] = client
    return client


def create_app(config: dict[str, Any] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.update(
        REDIS_URL=os.getenv("REDIS_URL", "redis://redis:6379"),
        REDIS_ENABLED=os.getenv("DISABLE_REDIS", "").lower()
        not in {"1", "true", "yes"},
    )
    if config:
        app.config.update(config)
    if app.config.get("TESTING"):
        app.config["REDIS_ENABLED"] = False

    @app.before_request
    def handle_options_and_methods() -> Response | None:
        if request.method == "OPTIONS":
            return json_response(204, None)
        if request.method != "GET":
            return json_response(
                405,
                {"error": "Méthode non autorisée. Utiliser GET."},
                {"Allow": "GET, OPTIONS"},
            )
        return None

    @app.errorhandler(404)
    def not_found(_: Exception) -> Response:
        return json_response(404, {"error": "Route introuvable."})

    @app.get("/")
    def hello() -> Response:
        return json_response(200, {"message": "Hello from backend-python"})

    @app.get("/calculate")
    def calculate() -> Response:
        op = request.args.get("operation")
        raw_a = request.args.get("a")
        raw_b = request.args.get("b")

        if op in (None, "") or raw_a in (None, "") or raw_b in (None, ""):
            return json_response(
                400, {"error": "Paramètres attendus : operation, a, b"}
            )

        num_a = parse_number(raw_a)
        num_b = parse_number(raw_b)
        if num_a is None or num_b is None:
            return json_response(
                400, {"error": "Les paramètres a et b doivent être des nombres."}
            )

        operation = OPERATIONS.get(op)
        if operation is None:
            return json_response(
                400,
                {
                    "error": "Opération inconnue. Utiliser : add, subtract, multiply, divide"
                },
            )

        cache_key = f"{op}:{cache_part(num_a)}:{cache_part(num_b)}"
        redis_client = get_redis_client()

        if redis_client is not None:
            try:
                cached_result = redis_client.get(cache_key)
                if cached_result is not None:
                    return json_response(
                        200,
                        {
                            "operation": op,
                            "a": num_a,
                            "b": num_b,
                            "result": float(cached_result),
                            "cached": True,
                        },
                    )
            except (RedisError, OSError):
                pass

        try:
            result = operation(num_a, num_b)
        except ValueError as error:
            return json_response(400, {"error": str(error)})

        if redis_client is not None:
            try:
                redis_client.setex(cache_key, CACHE_TTL_SECONDS, str(result))
            except (RedisError, OSError):
                pass

        return json_response(
            200,
            {
                "operation": op,
                "a": num_a,
                "b": num_b,
                "result": result,
                "cached": False,
            },
        )

    return app


app = create_app()

if __name__ == "__main__":  # pragma: no cover
    port = int(os.getenv("PORT", "3000"))
    app.run(host="0.0.0.0", port=port)
