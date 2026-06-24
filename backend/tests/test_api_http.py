"""Tests d'intégration HTTP exécutés depuis docker-compose.test.yml."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

import pytest

BASE_URL = os.getenv("TEST_BASE_URL")
pytestmark = pytest.mark.skipif(
    not BASE_URL,
    reason="TEST_BASE_URL doit être défini pour les tests HTTP Docker Compose.",
)


def request_json(path: str) -> tuple[int, dict[str, Any]]:
    """Appelle l'API HTTP réelle et renvoie le statut + le JSON."""
    assert BASE_URL is not None
    url = f"{BASE_URL}{path}"
    last_error: Exception | None = None

    for _ in range(20):
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                payload = response.read().decode("utf-8")
                return response.status, json.loads(payload)
        except urllib.error.HTTPError as error:
            payload = error.read().decode("utf-8")
            return error.code, json.loads(payload)
        except OSError as error:
            last_error = error
            time.sleep(0.25)

    raise AssertionError(f"API indisponible sur {url}: {last_error}")


def test_http_backend_calculates_through_network():
    unique_value = time.time_ns() % 1_000_000

    status, body = request_json(f"/calculate?operation=add&a={unique_value}&b=3")

    assert status == 200
    assert body["operation"] == "add"
    assert body["a"] == unique_value
    assert body["b"] == 3
    assert body["result"] == unique_value + 3
    assert body["cached"] is False


def test_http_backend_reuses_redis_cache():
    unique_value = time.time_ns() % 1_000_000
    path = f"/calculate?operation=multiply&a={unique_value}&b=7"

    first_status, first_body = request_json(path)
    second_status, second_body = request_json(path)

    assert first_status == 200
    assert first_body["result"] == unique_value * 7
    assert first_body["cached"] is False

    assert second_status == 200
    assert second_body["result"] == unique_value * 7
    assert second_body["cached"] is True


def test_http_backend_exposes_validation_errors():
    status, body = request_json("/calculate?operation=divide&a=10&b=0")

    assert status == 400
    assert body == {"error": "Division par zéro impossible."}
