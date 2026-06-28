"""Agent Runtime — responde uma mensagem de atendimento ancorada na KB, com
guardrails, e decide o ciclo (continue/resolved/handoff).

Stateless por chamada: o estado (history, turn-taking, suspend/resume) vive no
business (FlowRun). Este é o ponto de entrada compartilhado do ADR 0020 — o nó
`agent` do FlowBuilder e (futuro) o Agente standalone chamam aqui.
"""

import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .auth import require_internal_token
from .embedding import EmbeddingError
from .llm import LLMError, chat
from .retrieve import retrieve_chunks

router = APIRouter()

_ACTION_RE = re.compile(r"\[\[ACTION:\s*(continue|resolved|handoff)\s*\]\]", re.IGNORECASE)


class Turn(BaseModel):
    role: str
    content: str


class AgentRequest(BaseModel):
    tenantId: str
    knowledgeBaseId: int
    persona: str = ""
    history: list[Turn] = []
    query: str
    topK: int = 6
    minScore: float = 0.0


def _build_system(persona: str, context: str) -> str:
    base = persona.strip() or "Você é um assistente de atendimento prestativo e objetivo."
    return (
        base
        + "\n\nRegras:\n"
        "- Responda SOMENTE com base no CONTEXTO abaixo e cite a fonte ([Fonte: ...]).\n"
        "- Se o contexto não cobre a pergunta, NÃO invente — diga que vai transferir para um atendente.\n"
        "- Ao FINAL da resposta, emita UMA tag de controle em linha separada (ela NÃO é vista pelo usuário):\n"
        "  [[ACTION:continue]] se o diálogo continua (você perguntou algo ou aguarda resposta);\n"
        "  [[ACTION:resolved]] se a dúvida foi resolvida e o atendimento pode encerrar;\n"
        "  [[ACTION:handoff]] se precisa de atendente humano (fora do contexto, pedido explícito, frustração).\n\n"
        f"CONTEXTO:\n{context if context else '(vazio — sem informação na base)'}"
    )


@router.post("/agent/respond", dependencies=[Depends(require_internal_token)])
async def agent_respond(req: AgentRequest) -> dict:
    try:
        chunks = await retrieve_chunks(
            req.tenantId, req.knowledgeBaseId, req.query, req.topK, req.minScore
        )
    except EmbeddingError as e:
        raise HTTPException(status_code=400, detail=f"embedding indisponível: {e}")

    context = (
        "\n\n---\n\n".join(f"{c['text']}\n[Fonte: {c['citation']}]" for c in chunks)
        if chunks
        else ""
    )

    messages = [{"role": "system", "content": _build_system(req.persona, context)}]
    for turn in req.history:
        role = turn.role if turn.role in ("user", "assistant") else "user"
        messages.append({"role": role, "content": turn.content})
    if not req.history or req.history[-1].content != req.query:
        messages.append({"role": "user", "content": req.query})

    try:
        raw = await chat(req.tenantId, messages)
    except LLMError as e:
        # LLM indisponível → handoff seguro (nunca trava nem inventa).
        return {
            "reply": "Vou transferir você para um atendente.",
            "action": "handoff",
            "confidence": 0.0,
            "citations": [],
            "error": str(e)[:200],
        }

    match = _ACTION_RE.search(raw)
    action = match.group(1).lower() if match else "continue"
    reply = _ACTION_RE.sub("", raw).strip()

    # Guardrail: sem contexto, nunca alucinar → handoff.
    if not chunks:
        action = "handoff"
    if not reply:
        reply = "Desculpe, não consegui responder. Vou transferir para um atendente."
        action = "handoff"

    return {
        "reply": reply,
        "action": action,
        "confidence": 1.0 if chunks else 0.0,
        "citations": [c["sourceId"] for c in chunks],
    }
