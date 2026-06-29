"""Testes dos guardrails do Agent Runtime (app.agent.agent_respond).

Sem pytest-asyncio no projeto — dirige as corrotinas com asyncio.run e
monkeypatcha as dependências (retrieve_chunks, chat) no módulo app.agent.
"""

import asyncio

from app.agent import AgentRequest, agent_respond
from app.llm import LLMError


def _run(coro):
    return asyncio.run(coro)


def _patch(monkeypatch, chunks, chat_reply=None, chat_raises=None):
    async def fake_retrieve(*_a, **_k):
        return chunks

    async def fake_chat(*_a, **_k):
        if chat_raises is not None:
            raise chat_raises
        return chat_reply

    monkeypatch.setattr("app.agent.retrieve_chunks", fake_retrieve)
    monkeypatch.setattr("app.agent.chat", fake_chat)


def _req(query="qual o horario?"):
    return AgentRequest(tenantId="t1", knowledgeBaseId=1, query=query)


def _chunk(source_id=7, text="Funciona das 9h as 18h."):
    return {"text": text, "sourceId": source_id, "score": 0.9, "citation": f"source:{source_id}"}


def test_agent_no_chunks_forces_handoff(monkeypatch):
    # Sem contexto recuperado → nunca alucinar: handoff + confiança 0.
    _patch(monkeypatch, chunks=[], chat_reply="qualquer coisa [[ACTION:continue]]")
    out = _run(agent_respond(_req()))
    assert out["action"] == "handoff"
    assert out["confidence"] == 0.0


def test_agent_llm_error_degrades_to_handoff(monkeypatch):
    # Erro do LLM → linha de transferência, sem propagar exceção.
    _patch(monkeypatch, chunks=[_chunk()], chat_raises=LLMError("down"))
    out = _run(agent_respond(_req()))
    assert out["action"] == "handoff"
    assert "atendente" in out["reply"].lower()


def test_agent_parses_action_and_strips_tag(monkeypatch):
    _patch(
        monkeypatch,
        chunks=[_chunk()],
        chat_reply="Funciona das 9h às 18h. [Fonte: source:7]\n[[ACTION:resolved]]",
    )
    out = _run(agent_respond(_req()))
    assert out["action"] == "resolved"
    assert "[[ACTION" not in out["reply"]


def test_agent_appends_citation_when_missing(monkeypatch):
    # Resposta ancorada sem citação → anexa a fonte do trecho mais relevante.
    _patch(monkeypatch, chunks=[_chunk()], chat_reply="Funciona das 9h às 18h.")
    out = _run(agent_respond(_req()))
    assert "[Fonte: source:7]" in out["reply"]
    assert out["action"] == "continue"  # default quando não há tag


def test_agent_does_not_duplicate_existing_citation(monkeypatch):
    _patch(monkeypatch, chunks=[_chunk()], chat_reply="Resposta. [Fonte: source:7]")
    out = _run(agent_respond(_req()))
    assert out["reply"].lower().count("[fonte:") == 1
