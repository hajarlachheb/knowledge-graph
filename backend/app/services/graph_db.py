"""Neo4j graph database operations — create/read nodes and relationships."""

from __future__ import annotations

import logging
from typing import Any

from neo4j import AsyncGraphDatabase, AsyncDriver

from app.config import settings
from app.models.graph import GraphNode, GraphRelationship, NodeType

logger = logging.getLogger(__name__)


class GraphDB:
    _driver: AsyncDriver | None = None

    async def connect(self) -> None:
        self._driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
        )
        await self._ensure_indexes()

    async def close(self) -> None:
        if self._driver:
            await self._driver.close()

    @property
    def driver(self) -> AsyncDriver:
        assert self._driver is not None, "Call connect() first"
        return self._driver

    # ── Schema bootstrap ───────────────────────────────

    async def _ensure_indexes(self) -> None:
        async with self.driver.session() as session:
            for nt in NodeType:
                await session.run(
                    f"CREATE INDEX IF NOT EXISTS FOR (n:{nt.value}) ON (n.id)"
                )
            await session.run(
                "CREATE INDEX IF NOT EXISTS FOR (n:Document) ON (n.source_id)"
            )

    # ── Write ──────────────────────────────────────────

    async def merge_node(self, node: GraphNode) -> None:
        props = {
            "name": node.name,
            "updated_at": node.updated_at.isoformat(),
            **node.properties,
        }
        if node.source_url:
            props["source_url"] = node.source_url
        if node.source_doc_id:
            props["source_doc_id"] = node.source_doc_id

        query = (
            f"MERGE (n:{node.node_type.value} {{id: $id}}) "
            "SET n += $props, n.created_at = coalesce(n.created_at, $created_at)"
        )
        async with self.driver.session() as session:
            await session.run(
                query,
                id=node.id,
                props=props,
                created_at=node.created_at.isoformat(),
            )

    async def merge_relationship(self, rel: GraphRelationship) -> None:
        query = (
            "MATCH (a {id: $src}), (b {id: $tgt}) "
            f"MERGE (a)-[r:{rel.rel_type.value}]->(b) "
            "SET r += $props"
        )
        props = {**rel.properties}
        if rel.source_doc_id:
            props["source_doc_id"] = rel.source_doc_id

        async with self.driver.session() as session:
            await session.run(query, src=rel.source_id, tgt=rel.target_id, props=props)

    async def write_extraction(
        self, nodes: list[GraphNode], rels: list[GraphRelationship]
    ) -> None:
        for node in nodes:
            await self.merge_node(node)
        for rel in rels:
            await self.merge_relationship(rel)

    # ── Read / traversal ───────────────────────────────

    async def get_node(self, node_id: str) -> dict[str, Any] | None:
        query = "MATCH (n {id: $id}) RETURN n"
        async with self.driver.session() as session:
            result = await session.run(query, id=node_id)
            record = await result.single()
            if record is None:
                return None
            return dict(record["n"])

    async def search_nodes(self, name_fragment: str, limit: int = 10) -> list[dict]:
        query = (
            "MATCH (n) WHERE toLower(n.name) CONTAINS toLower($frag) "
            "RETURN n, labels(n) AS labels LIMIT $limit"
        )
        async with self.driver.session() as session:
            result = await session.run(query, frag=name_fragment, limit=limit)
            records = [r async for r in result]
            return [
                {**dict(r["n"]), "labels": r["labels"]}
                for r in records
            ]

    async def get_subgraph(self, center_id: str, depth: int = 1) -> dict[str, Any]:
        """Return nodes and edges within *depth* hops of *center_id*."""
        query = (
            "MATCH path = (center {id: $id})-[*1.." + str(depth) + "]-(neighbor) "
            "RETURN nodes(path) AS ns, relationships(path) AS rs"
        )
        nodes_map: dict[str, dict] = {}
        edges: list[dict] = []

        async with self.driver.session() as session:
            result = await session.run(query, id=center_id)
            async for record in result:
                for n in record["ns"]:
                    nd = dict(n)
                    nid = nd.get("id", str(n.element_id))
                    nodes_map[nid] = nd
                for r in record["rs"]:
                    edges.append(
                        {
                            "source": dict(r.start_node).get("id"),
                            "target": dict(r.end_node).get("id"),
                            "type": r.type,
                            **dict(r),
                        }
                    )

        return {"nodes": list(nodes_map.values()), "edges": edges}

    async def traverse_from_entity(
        self, entity_name: str, rel_types: list[str] | None = None, limit: int = 20
    ) -> list[dict]:
        """Find an entity by name and traverse outgoing relationships."""
        rel_filter = ""
        if rel_types:
            rel_filter = ":" + "|".join(rel_types)

        query = (
            f"MATCH (a)-[r{rel_filter}]->(b) "
            "WHERE toLower(a.name) CONTAINS toLower($name) "
            "RETURN a, type(r) AS rel, b LIMIT $limit"
        )
        async with self.driver.session() as session:
            result = await session.run(query, name=entity_name, limit=limit)
            records = [r async for r in result]
            return [
                {
                    "from": dict(r["a"]),
                    "relationship": r["rel"],
                    "to": dict(r["b"]),
                }
                for r in records
            ]
