"""Pydantic schemas for the knowledge graph node and relationship types."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Node types ─────────────────────────────────────────

class NodeType(str, Enum):
    PERSON = "Person"
    PROJECT = "Project"
    DOCUMENT = "Document"
    DECISION = "Decision"
    MEETING = "Meeting"
    CODE_REPO = "CodeRepo"
    PRODUCT = "Product"
    TEAM = "Team"
    TECHNOLOGY = "Technology"
    CONCEPT = "Concept"


class RelationshipType(str, Enum):
    AUTHORED = "AUTHORED"
    WORKED_ON = "WORKED_ON"
    DECIDED = "DECIDED"
    RELATED_TO = "RELATED_TO"
    DEPENDS_ON = "DEPENDS_ON"
    PRESENTED_AT = "PRESENTED_AT"
    EXPERT_IN = "EXPERT_IN"
    MENTIONED_IN = "MENTIONED_IN"
    SUPERSEDED_BY = "SUPERSEDED_BY"
    CONTAINS = "CONTAINS"
    DISCUSSED = "DISCUSSED"
    ENABLES = "ENABLES"
    BELONGS_TO = "BELONGS_TO"


# ── Schemas ────────────────────────────────────────────

class GraphNode(BaseModel):
    """A node in the knowledge graph."""

    id: str = Field(description="Deterministic id: <type>:<slug>")
    node_type: NodeType
    name: str
    properties: dict[str, Any] = Field(default_factory=dict)
    source_url: str | None = None
    source_doc_id: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GraphRelationship(BaseModel):
    """A directed relationship between two nodes."""

    source_id: str
    target_id: str
    rel_type: RelationshipType
    properties: dict[str, Any] = Field(default_factory=dict)
    source_doc_id: str | None = None


class ExtractionResult(BaseModel):
    """Output of the LLM entity/relationship extraction step."""

    nodes: list[GraphNode] = Field(default_factory=list)
    relationships: list[GraphRelationship] = Field(default_factory=list)


class SubgraphResponse(BaseModel):
    """A subgraph returned for visualization."""

    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
