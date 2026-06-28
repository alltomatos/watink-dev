"""Chunking token-aware (~512 tokens, overlap ~15%) via tiktoken."""

import tiktoken

from .config import config

_enc = tiktoken.get_encoding("cl100k_base")


def chunk_text(text: str, max_tokens: int | None = None, overlap: int | None = None) -> list[str]:
    max_tokens = max_tokens or config.CHUNK_TOKENS
    overlap = overlap or config.CHUNK_OVERLAP

    text = (text or "").strip()
    if not text:
        return []

    tokens = _enc.encode(text)
    if len(tokens) <= max_tokens:
        return [text]

    chunks: list[str] = []
    step = max(1, max_tokens - overlap)
    for start in range(0, len(tokens), step):
        window = tokens[start : start + max_tokens]
        if not window:
            break
        piece = _enc.decode(window).strip()
        if piece:
            chunks.append(piece)
        if start + max_tokens >= len(tokens):
            break

    return chunks
