"""Testes offline do cliente Firecrawl (httpx.MockTransport — sem rede real)."""

import asyncio

import httpx
import pytest

from app import firecrawl
from app.config import config


def _run(handler, url="https://exemplo.com"):
    """Executa scrape_markdown com um cliente httpx mockado pelo handler."""

    async def go():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await firecrawl.scrape_markdown(url, client=client)

    return asyncio.run(go())


def test_scrape_markdown_ok(monkeypatch):
    monkeypatch.setattr(config, "FIRECRAWL_URL", "http://firecrawl:3002")

    def handler(request):
        assert request.url.path == "/v1/scrape"
        return httpx.Response(
            200, json={"success": True, "data": {"markdown": "# Título\nconteúdo"}}
        )

    md = _run(handler)
    assert "Título" in md
    assert "conteúdo" in md


def test_scrape_sends_bearer_when_key_set(monkeypatch):
    monkeypatch.setattr(config, "FIRECRAWL_URL", "http://firecrawl:3002")
    monkeypatch.setattr(config, "FIRECRAWL_API_KEY", "fc-secret")
    seen = {}

    def handler(request):
        seen["auth"] = request.headers.get("Authorization")
        return httpx.Response(200, json={"success": True, "data": {"markdown": "ok"}})

    _run(handler)
    assert seen["auth"] == "Bearer fc-secret"


def test_scrape_omits_bearer_when_no_key(monkeypatch):
    monkeypatch.setattr(config, "FIRECRAWL_URL", "http://firecrawl:3002")
    monkeypatch.setattr(config, "FIRECRAWL_API_KEY", "")
    seen = {}

    def handler(request):
        seen["auth"] = request.headers.get("Authorization")
        return httpx.Response(200, json={"success": True, "data": {"markdown": "ok"}})

    _run(handler)
    assert seen["auth"] is None


def test_scrape_falls_back_to_content_field(monkeypatch):
    monkeypatch.setattr(config, "FIRECRAWL_URL", "http://firecrawl:3002")

    def handler(request):
        return httpx.Response(200, json={"success": True, "data": {"content": "legado v0"}})

    assert _run(handler) == "legado v0"


def test_scrape_missing_config_raises(monkeypatch):
    monkeypatch.setattr(config, "FIRECRAWL_URL", "")
    with pytest.raises(firecrawl.FirecrawlError):
        asyncio.run(firecrawl.scrape_markdown("https://exemplo.com"))


def test_scrape_empty_url_raises(monkeypatch):
    monkeypatch.setattr(config, "FIRECRAWL_URL", "http://firecrawl:3002")
    with pytest.raises(firecrawl.FirecrawlError):
        asyncio.run(firecrawl.scrape_markdown("   "))


def test_scrape_success_false_raises(monkeypatch):
    monkeypatch.setattr(config, "FIRECRAWL_URL", "http://firecrawl:3002")

    def handler(request):
        return httpx.Response(200, json={"success": False, "error": "blocked"})

    with pytest.raises(firecrawl.FirecrawlError):
        _run(handler)


def test_scrape_empty_markdown_raises(monkeypatch):
    monkeypatch.setattr(config, "FIRECRAWL_URL", "http://firecrawl:3002")

    def handler(request):
        return httpx.Response(200, json={"success": True, "data": {"markdown": "   "}})

    with pytest.raises(firecrawl.FirecrawlError):
        _run(handler)


def test_scrape_http_error_raises(monkeypatch):
    monkeypatch.setattr(config, "FIRECRAWL_URL", "http://firecrawl:3002")

    def handler(request):
        return httpx.Response(502, text="bad gateway")

    with pytest.raises(firecrawl.FirecrawlError):
        _run(handler)
