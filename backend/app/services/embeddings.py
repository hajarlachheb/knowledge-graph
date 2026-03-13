"""Embedding generation using OpenAI's API."""

from __future__ import annotations

from langchain_openai import OpenAIEmbeddings

from app.config import settings

_embeddings: OpenAIEmbeddings | None = None


def get_embeddings() -> OpenAIEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = OpenAIEmbeddings(
            model=settings.openai_embedding_model,
            openai_api_key=settings.openai_api_key,
        )
    return _embeddings


def chunk_text(text: str, max_tokens: int = 500, overlap: int = 50) -> list[str]:
    """Split text into overlapping chunks by approximate token count (1 token ~ 4 chars)."""
    char_limit = max_tokens * 4
    overlap_chars = overlap * 4
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + char_limit
        chunk = text[start:end]
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap_chars
    return chunks or [text]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    emb = get_embeddings()
    return await emb.aembed_documents(texts)


async def embed_query(text: str) -> list[float]:
    emb = get_embeddings()
    return await emb.aembed_query(text)
