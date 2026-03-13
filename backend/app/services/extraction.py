"""LLM-based entity and relationship extraction from document text."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone

from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app.models.graph import (
    ExtractionResult,
    GraphNode,
    GraphRelationship,
    NodeType,
    RelationshipType,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are an entity and relationship extractor for a company knowledge graph.

Given a document's title and text, extract:
1. **Entities** (nodes) — each with a type and a canonical name.
   Valid types: Person, Project, Document, Decision, Meeting, CodeRepo, Product, Team, Technology, Concept.
2. **Relationships** between extracted entities.
   Valid types: AUTHORED, WORKED_ON, DECIDED, RELATED_TO, DEPENDS_ON, PRESENTED_AT, EXPERT_IN, MENTIONED_IN, SUPERSEDED_BY, CONTAINS, DISCUSSED, ENABLES, BELONGS_TO.

Return ONLY valid JSON with this schema (no markdown fences):
{
  "entities": [
    {"type": "<NodeType>", "name": "<canonical name>", "properties": {}}
  ],
  "relationships": [
    {"source": "<entity name>", "target": "<entity name>", "type": "<RelationshipType>", "properties": {}}
  ]
}

Rules:
- Use canonical, concise names (e.g. "Alice Smith" not "alice" or "Alice S.").
- The Document itself should be one entity.
- If uncertain about a relationship, omit it.
- Keep properties minimal (role, date, short description).
"""


def _slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


class ExtractionService:
    def __init__(self) -> None:
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key,
            temperature=0,
        )

    async def extract(
        self, doc_id: str, title: str, text: str, source_url: str | None = None
    ) -> ExtractionResult:
        human = f"Document title: {title}\n\n{text[:12_000]}"

        response = await self.llm.ainvoke(
            [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=human)]
        )

        raw = response.content.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            logger.error("LLM returned invalid JSON for doc %s: %s", doc_id, raw[:300])
            return ExtractionResult()

        now = datetime.now(timezone.utc)

        nodes: list[GraphNode] = []
        name_to_id: dict[str, str] = {}

        for ent in data.get("entities", []):
            try:
                ntype = NodeType(ent["type"])
            except (ValueError, KeyError):
                continue
            name = ent["name"]
            nid = f"{ntype.value}:{_slug(name)}"
            name_to_id[name] = nid
            nodes.append(
                GraphNode(
                    id=nid,
                    node_type=ntype,
                    name=name,
                    properties=ent.get("properties", {}),
                    source_url=source_url,
                    source_doc_id=doc_id,
                    created_at=now,
                    updated_at=now,
                )
            )

        relationships: list[GraphRelationship] = []
        for rel in data.get("relationships", []):
            try:
                rtype = RelationshipType(rel["type"])
            except (ValueError, KeyError):
                continue
            src_id = name_to_id.get(rel.get("source", ""))
            tgt_id = name_to_id.get(rel.get("target", ""))
            if not src_id or not tgt_id:
                continue
            relationships.append(
                GraphRelationship(
                    source_id=src_id,
                    target_id=tgt_id,
                    rel_type=rtype,
                    properties=rel.get("properties", {}),
                    source_doc_id=doc_id,
                )
            )

        return ExtractionResult(nodes=nodes, relationships=relationships)
