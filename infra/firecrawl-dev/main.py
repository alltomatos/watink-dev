"""DEV-ONLY — shim compatível com o Firecrawl (POST /v1/scrape).

NÃO É O FIRECRAWL REAL. Implementa só o mínimo do contrato que o watink-knowledge
consome em dev (Docker standalone): busca a URL e devolve o texto da página como
markdown. Sem renderização JS, sem remoção de boilerplate — é só para validar o
pipeline de ingestão localmente.

Em produção (Swarm), FIRECRAWL_URL aponta para um Firecrawl real e este serviço
não é usado. Mesmo padrão do MinIO↔S3: infra leve em dev, serviço real em prod.
"""

import re
from html.parser import HTMLParser

import httpx
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="firecrawl-dev-shim")

_DROP_TAGS = {"script", "style", "noscript", "svg", "head"}


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in _DROP_TAGS:
            self._skip += 1

    def handle_endtag(self, tag):
        if tag in _DROP_TAGS and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if self._skip:
            return
        text = data.strip()
        if text:
            self.parts.append(text)


def _html_to_text(html: str) -> str:
    parser = _TextExtractor()
    parser.feed(html)
    text = "\n".join(parser.parts)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


class ScrapeBody(BaseModel):
    url: str
    formats: list[str] | None = None
    onlyMainContent: bool | None = None


@app.get("/health")
def health():
    return {"ok": True, "shim": True}


@app.post("/v1/scrape")
def scrape(body: ScrapeBody):
    try:
        resp = httpx.get(
            body.url,
            timeout=30,
            follow_redirects=True,
            headers={"User-Agent": "watink-firecrawl-dev/1.0"},
        )
        resp.raise_for_status()
    except httpx.HTTPError as e:
        return {"success": False, "error": f"shim fetch failed: {e}"}

    markdown = _html_to_text(resp.text)
    return {
        "success": True,
        "data": {
            "markdown": markdown,
            "metadata": {"sourceURL": body.url, "shim": True},
        },
    }
