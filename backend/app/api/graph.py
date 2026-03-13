"""Graph API — subgraph visualization and node lookup."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.models.graph import SubgraphResponse
from app.services.graph_db import GraphDB
from app.api.deps import get_graph_db

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/node/{node_id}")
async def get_node(node_id: str, db: GraphDB = Depends(get_graph_db)):
    node = await db.get_node(node_id)
    if node is None:
        return {"error": "Node not found"}
    return node


@router.get("/search")
async def search_nodes(
    q: str = Query(min_length=1),
    limit: int = Query(default=10, ge=1, le=50),
    db: GraphDB = Depends(get_graph_db),
):
    return await db.search_nodes(q, limit=limit)


@router.get("/subgraph/{node_id}", response_model=SubgraphResponse)
async def get_subgraph(
    node_id: str,
    depth: int = Query(default=1, ge=1, le=3),
    db: GraphDB = Depends(get_graph_db),
):
    result = await db.get_subgraph(node_id, depth=depth)
    return SubgraphResponse(nodes=result["nodes"], edges=result["edges"])


@router.get("/traverse")
async def traverse(
    entity: str = Query(min_length=1),
    rel_types: str | None = Query(default=None, description="Comma-separated relationship types"),
    limit: int = Query(default=20, ge=1, le=100),
    db: GraphDB = Depends(get_graph_db),
):
    types = [r.strip() for r in rel_types.split(",")] if rel_types else None
    return await db.traverse_from_entity(entity, rel_types=types, limit=limit)
