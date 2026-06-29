"""Cliente de embedding via omniroute (gateway OpenAI-compatível do tenant).

Lê baseURL/apiKey/model das settings do tenant; valida a dimensão contra a
coluna `halfvec`; faz backoff em rate-limit (429).
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
    if not ai["base_url"] or not ai["model"]:
        raise EmbeddingError("aiCustomBaseURL/aiEmbeddingModel não configurados para o tenant")

    url = ai["base_url"].rstrip("/") + "/embeddings"
    headers = {"Authorization": f"Bearer {ai['api_key']}", "Content-Type": "application/json"}
    payload = {"model": ai["model"], "input": texts}

    last_err = None
    async with httpx.AsyncClient(timeout=90) as client:
        for attempt in range(len(_RETRY_DELAYS) + 1):
            try:
                resp = await client.post(url, json=payload, headers=headers)
            except httpx.HTTPError as e:
                # Falha de conexão/timeout com o omniroute (gateway de IA, no host).
                # Mensagem acionável em vez do httpx.ConnectError cru
                # ("All connection attempts failed") vazar para o status da fonte.
                raise EmbeddingError(
                    f"omniroute inacessível em {url} ({type(e).__name__}) — "
                    f"o gateway de IA (host:20128) está rodando?"
                ) from e
            if resp.status_code == 200:
                data = resp.json()
                vectors = [item["embedding"] for item in data["data"]]
                for v in vectors:
                    if len(v) != config.EMBED_DIM:
                        raise EmbeddingError(
                            f"ERR_EMBEDDING_DIM_MISMATCH: esperado {config.EMBED_DIM}, veio {len(v)}"
                        )
                return vectors, ai["model"]

            last_err = f"omniroute {resp.status_code}: {resp.text[:200]}"
            if resp.status_code == 429 and attempt < len(_RETRY_DELAYS):
                await asyncio.sleep(_RETRY_DELAYS[attempt])
                continue
            break

    raise EmbeddingError(last_err or "embedding failed")
