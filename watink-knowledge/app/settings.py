"""Leitura das settings de IA do tenant (omniroute) da tabela Settings.

Tenant-scoped por `WHERE "tenantId"` manual (RLS é inerte para este serviço).
"""

from .config import config
from .db import get_pool

_AI_KEYS = ["aiCustomBaseURL", "aiApiKey", "aiEmbeddingModel", "aiProvider"]


async def get_ai_settings(tenant_id: str) -> dict:
    pool = get_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                'SELECT key, value FROM "Settings" WHERE "tenantId" = %s AND key = ANY(%s)',
                (tenant_id, _AI_KEYS),
            )
            rows = await cur.fetchall()
    s = {k: v for k, v in rows}

    base_url = s.get("aiCustomBaseURL", "") or ""
    # Em dev o omniroute roda no host (localhost:20128); de dentro do container
    # isso precisa virar host.docker.internal.
    for host in ("localhost", "127.0.0.1"):
        base_url = base_url.replace(host, config.OMNIROUTE_HOST_REWRITE)

    return {
        "base_url": base_url,
        "api_key": s.get("aiApiKey", "") or "",
        "model": s.get("aiEmbeddingModel", "") or "",
    }
