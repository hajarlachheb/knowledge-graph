"""Weaviate vector store — stores document chunk embeddings for semantic search."""

from __future__ import annotations

import logging
import uuid
from typing import Any

import weaviate
from weaviate.classes.config import Configure, Property, DataType
from weaviate.classes.query import MetadataQuery

from app.config import settings

logger = logging.getLogger(__name__)

COLLECTION_NAME = "DocumentChunk"


class VectorStore:
    _client: weaviate.WeaviateClient | None = None

    async def connect(self) -> None:
        self._client = weaviate.connect_to_custom(
            http_host=settings.weaviate_url.replace("http://", "").split(":")[0],
            http_port=int(settings.weaviate_url.rsplit(":", 1)[-1]),
            http_secure=False,
            grpc_host=settings.weaviate_url.replace("http://", "").split(":")[0],
            grpc_port=50051,
            grpc_secure=False,
        )
        self._ensure_collection()

    def close(self) -> None:
        if self._client:
            self._client.close()

    @property
    def client(self) -> weaviate.WeaviateClient:
        assert self._client is not None, "Call connect() first"
        return self._client

    def _ensure_collection(self) -> None:
        if not self.client.collections.exists(COLLECTION_NAME):
            self.client.collections.create(
                name=COLLECTION_NAME,
                vectorizer_config=Configure.Vectorizer.none(),
                properties=[
                    Property(name="doc_id", data_type=DataType.TEXT),
                    Property(name="source", data_type=DataType.TEXT),
                    Property(name="title", data_type=DataType.TEXT),
                    Property(name="url", data_type=DataType.TEXT),
                    Property(name="chunk_index", data_type=DataType.INT),
                    Property(name="text", data_type=DataType.TEXT),
                ],
            )

    # ── Write ──────────────────────────────────────────

    def upsert_chunks(
        self,
        doc_id: str,
        title: str,
        url: str,
        chunks: list[str],
        embeddings: list[list[float]],
        source: str = "notion",
    ) -> None:
        collection = self.client.collections.get(COLLECTION_NAME)

        self._delete_by_doc_id(doc_id)

        with collection.batch.dynamic() as batch:
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                batch.add_object(
                    properties={
                        "doc_id": doc_id,
                        "source": source,
                        "title": title,
                        "url": url,
                        "chunk_index": i,
                        "text": chunk,
                    },
                    vector=emb,
                    uuid=uuid.uuid5(uuid.NAMESPACE_URL, f"{doc_id}:{i}"),
                )

    def _delete_by_doc_id(self, doc_id: str) -> None:
        collection = self.client.collections.get(COLLECTION_NAME)
        collection.data.delete_many(
            where=weaviate.classes.query.Filter.by_property("doc_id").equal(doc_id)
        )

    # ── Search ─────────────────────────────────────────

    def search(
        self, query_embedding: list[float], top_k: int = 5
    ) -> list[dict[str, Any]]:
        collection = self.client.collections.get(COLLECTION_NAME)
        results = collection.query.near_vector(
            near_vector=query_embedding,
            limit=top_k,
            return_metadata=MetadataQuery(distance=True),
        )
        return [
            {
                "doc_id": obj.properties.get("doc_id"),
                "title": obj.properties.get("title"),
                "url": obj.properties.get("url"),
                "text": obj.properties.get("text"),
                "chunk_index": obj.properties.get("chunk_index"),
                "distance": obj.metadata.distance if obj.metadata else None,
            }
            for obj in results.objects
        ]
