"""Cliente do Firecrawl (web scraping → markdown) para fontes do tipo `url`.

Self-hosted (mendable/firecrawl), endpoint POST /v1/scrape. O deploy do devops
não exige autenticação; FIRECRAWL_API_KEY é opcional (o header Authorization só é
enviado quando setado). A resposta vem como {"success", "data": {"markdown", ...}}.

O cliente httpx é injetável (param `client`) para permitir teste offline com
httpx.MockTransport sem rede real.
"""

import logging

import httpx

from .config import config

log = logging.getLogger("firecrawl")


class FirecrawlError(RuntimeError):
    """Falha ao raspar uma URL via Firecrawl (config ausente, rede, ou success=false)."""


def _base_url() -> str:
    base = (config.FIRECRAWL_URL or "").strip().rstrip("/")
    if not base:
        raise FirecrawlError("FIRECRAWL_URL não configurado")
    return base


async def scrape_markdown(url: str, *, client: httpx.AsyncClient | None = None) -> str:
    """Raspa uma única página e retorna o conteúdo em markdown.

    Levanta FirecrawlError em: config ausente, url vazia, erro de rede/timeout,
    HTTP não-2xx, resposta não-JSON, success=false, ou markdown vazio.
    """
    target = (url or "").strip()
    if not target:
        raise FirecrawlError("url vazia")

    endpoint = f"{_base_url()}/v1/scrape"
    headers = {"Content-Type": "application/json"}
    if config.FIRECRAWL_API_KEY:
        headers["Authorization"] = f"Bearer {config.FIRECRAWL_API_KEY}"

    body = {"url": target, "formats": ["markdown"], "onlyMainContent": True}

    owns_client = client is None
    http = client or httpx.AsyncClient(timeout=config.FIRECRAWL_TIMEOUT)
    try:
        resp = await http.post(endpoint, json=body, headers=headers)
    except httpx.HTTPError as e:
        raise FirecrawlError(f"falha de rede ao chamar Firecrawl: {e}") from e
    finally:
        if owns_client:
            await http.aclose()

    if resp.status_code >= 400:
        raise FirecrawlError(f"Firecrawl HTTP {resp.status_code}: {resp.text[:200]}")

    try:
        data = resp.json()
    except ValueError as e:
        raise FirecrawlError("resposta do Firecrawl não é JSON") from e

    if data.get("success") is False:
        raise FirecrawlError(f"Firecrawl: {data.get('error') or 'success=false'}")

    payload = data.get("data") or {}
    markdown = (payload.get("markdown") or "").strip()
    if not markdown:
        # Builds antigos (v0) devolvem 'content' em vez de 'markdown'.
        markdown = (payload.get("content") or "").strip()
    if not markdown:
        raise FirecrawlError("Firecrawl não retornou markdown")
    return markdown
