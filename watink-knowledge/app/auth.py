from fastapi import Header, HTTPException

from .config import config


async def require_internal_token(x_internal_token: str = Header(default="")) -> None:
    """Garante que só o `business` (rede interna) chama o serviço.

    O frontend NUNCA fala direto com o watink-knowledge.
    """
    if x_internal_token != config.INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="invalid internal token")
