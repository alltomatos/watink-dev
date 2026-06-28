"""Endpoint de retrieval RAG (HTTP interno, chamado pelo business)."""

from fastapi import APIRouter, Depends, HTTPException
from pgvector.psycopg import HalfVector, register_vector_async
from pydantic import BaseModel

from .auth import require_internal_token
from .db import get_pool
from .embedding import EmbeddingError, embed_texts

router = APIRouter()


class RetrieveRequest(BaseModel):
    tenantId: str
    knowledgeBaseId: int
    query: str
    topK: int = 6
    minScore: float = 0.0


@router.post("/retrieve", dependencies=[Depends(require_internal_token)])
async def retrieve(req: RetrieveRequest) -> dict:
    try:
        vectors, _ = await embed_texts(req.tenantId, [req.query])
    except EmbeddingError as e:
        raise HTTPException(status_code=400, detail=f"embedding indisponível: {e}")
    qvec = HalfVector(vectors[0])

    pool = get_pool()
    async with pool.connection() as conn:
        await register_vector_async(conn)
        async with conn.cursor() as cur:
            await cur.execute(
                '''
                SELECT content, "sourceId", 1 - (embedding <=> %s) AS score
                FROM "KBChunk"
                WHERE "tenantId" = %s AND "knowledgeBaseId" = %s
                ORDER BY embedding <=> %s
                LIMIT %s
                ''',
                (qvec, req.tenantId, req.knowledgeBaseId, qvec, req.topK),
            )
            rows = await cur.fetchall()

    chunks = []
    for content, source_id, score in rows:
        score = float(score)
        if score < req.minScore:
            continue
        chunks.append(
            {
                "text": content,
                "sourceId": source_id,
                "score": score,
                "citation": f"source:{source_id}",
            }
        )
    return {"chunks": chunks}
