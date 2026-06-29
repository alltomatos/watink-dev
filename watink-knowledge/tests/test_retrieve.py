"""Testes do retrieval RAG (app.retrieve.retrieve_chunks).

Foca o guardrail de relevância (corte por min_score) e a forma da citação,
mockando embed_texts e o pool do Postgres (sem banco real).
"""

import asyncio

from app import retrieve as retrieve_mod
from app.retrieve import retrieve_chunks


def _run(coro):
    return asyncio.run(coro)


class _FakeCursor:
    def __init__(self, rows):
        self._rows = rows

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_a):
        return False

    async def execute(self, *_a, **_k):
        return None

    async def fetchall(self):
        return self._rows


class _FakeConn:
    def __init__(self, rows):
        self._rows = rows

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_a):
        return False

    def cursor(self):
        return _FakeCursor(self._rows)


class _FakePool:
    def __init__(self, rows):
        self._rows = rows

    def connection(self):
        return _FakeConn(self._rows)


def _patch(monkeypatch, rows):
    async def fake_embed(*_a, **_k):
        return [[0.0] * 4], "fake-model"

    async def fake_register(*_a, **_k):
        return None

    monkeypatch.setattr(retrieve_mod, "embed_texts", fake_embed)
    monkeypatch.setattr(retrieve_mod, "register_vector_async", fake_register)
    monkeypatch.setattr(retrieve_mod, "get_pool", lambda: _FakePool(rows))


def test_retrieve_filters_below_min_score(monkeypatch):
    # rows = (content, sourceId, score). min_score=0.5 corta o chunk de score 0.1.
    rows = [("trecho irrelevante", 1, 0.1), ("trecho relevante", 2, 0.8)]
    _patch(monkeypatch, rows)
    chunks = _run(retrieve_chunks("t1", 1, "pergunta", top_k=6, min_score=0.5))
    assert len(chunks) == 1
    assert chunks[0]["sourceId"] == 2
    assert chunks[0]["citation"] == "source:2"


def test_retrieve_keeps_all_above_floor(monkeypatch):
    rows = [("a", 1, 0.7), ("b", 2, 0.9)]
    _patch(monkeypatch, rows)
    chunks = _run(retrieve_chunks("t1", 1, "pergunta", top_k=6, min_score=0.5))
    assert len(chunks) == 2


def test_retrieve_default_min_score_is_nonzero(monkeypatch):
    # Default do guardrail > 0: um chunk fracamente similar (0.05) é descartado.
    rows = [("ruido", 1, 0.05)]
    _patch(monkeypatch, rows)
    chunks = _run(retrieve_chunks("t1", 1, "pergunta"))
    assert chunks == []
