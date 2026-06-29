import hmac

from fastapi import Header, HTTPException

from .config import config


async def require_internal_token(x_internal_token: str = Header(default="")) -> None:
    """Garante que só o `business` (rede interna) chama o serviço.

    O frontend NUNCA fala direto com o watink-knowledge. Fail-closed: sem
    INTERNAL_TOKEN configurado, recusa tudo (503) em vez de aceitar um segredo
    padrão. A comparação é constant-time (evita side-channel de timing).
    """
    expected = config.INTERNAL_TOKEN
    if not expected:
        raise HTTPException(status_code=503, detail="serviço sem INTERNAL_TOKEN configurado")
    if not hmac.compare_digest(x_internal_token, expected):
        raise HTTPException(status_code=401, detail="invalid internal token")
