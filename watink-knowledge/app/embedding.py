"""Cliente de embedding (gateway OpenAI-compatível: omniroute, Ollama, etc.).

Lê baseURL/apiKey/model das settings do tenant (com endpoint de embedding dedicado
opcional); valida a dimensão contra a coluna `halfvec`; faz backoff em rate-limit
(429); processa em SUB-LOTES para não estourar timeout em gateways lentos (ex.:
Ollama em CPU embedando dezenas de chunks).
"""

import asyncio

import httpx

from .config import config
from .settings import get_ai_settings

_RETRY_DELAYS = [1, 3, 8]


class EmbeddingError(Exception):
    pass


async def embed_texts(tenant_id: str, texts: list[str]) -> tuple[list[list[float]], str]:
    ai = await get_ai_settings(tenant_id)
    base = ai.get("embedding_base_url") or ai["base_url"]
    if not base or not ai["model"]:
        raise EmbeddingError("aiCustomBaseURL/aiEmbeddingModel não configurados para o tenant")

    url = base.rstrip("/") + "/embeddings"
    api_key = ai.get("embedding_api_key") or ai["api_key"]
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    model = ai["model"]

    all_vectors: list[list[float]] = []
    async with httpx.AsyncClient(timeout=config.EMBED_TIMEOUT) as client:
        for start in range(0, len(texts), config.EMBED_BATCH_SIZE):
            batch = texts[start : start + config.EMBED_BATCH_SIZE]
            all_vectors.extend(await _embed_batch(client, url, headers, model, batch))
    return all_vectors, model


async def _embed_batch(client, url, headers, model, texts) -> list[list[float]]:
    """Embeda UM lote, com backoff em 429 e checagem de dimensão."""
    payload = {"model": model, "input": texts}
    # Truncagem Matryoshka (MRL) opcional para encaixar a dimensão nativa do modelo
    # no índice halfvec — ex.: qwen3-embedding (Ollama) 2560 → 2048.
    if config.EMBED_DIMENSIONS > 0:
        payload["dimensions"] = config.EMBED_DIMENSIONS

    last_err = None
    for attempt in range(len(_RETRY_DELAYS) + 1):
        try:
            resp = await client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as e:
            # Falha de conexão/timeout com o gateway de embedding (omniroute, Ollama…).
            # Mensagem acionável em vez do httpx error cru vazar para o status da fonte.
            raise EmbeddingError(
                f"gateway de embedding inacessível em {url} ({type(e).__name__}) — "
                f"o serviço está rodando/respondendo a tempo?"
            ) from e

        if resp.status_code == 200:
            data = resp.json()
            vectors = [item["embedding"] for item in data["data"]]
            for v in vectors:
                if len(v) != config.EMBED_DIM:
                    raise EmbeddingError(
                        f"ERR_EMBEDDING_DIM_MISMATCH: esperado {config.EMBED_DIM}, veio {len(v)}"
                    )
            return vectors

        last_err = f"gateway {resp.status_code}: {resp.text[:200]}"
        if resp.status_code == 429 and attempt < len(_RETRY_DELAYS):
            await asyncio.sleep(_RETRY_DELAYS[attempt])
            continue
        break

    raise EmbeddingError(last_err or "embedding failed")
