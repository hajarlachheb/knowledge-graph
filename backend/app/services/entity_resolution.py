"""Entity resolution — merge duplicate nodes that refer to the same entity.

Uses simple heuristics (normalized name matching, alias detection).
Can be extended with embedding similarity for fuzzy matching.
"""

from __future__ import annotations

import re
from difflib import SequenceMatcher

from app.models.graph import GraphNode


def normalize(name: str) -> str:
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9 ]", "", name)
    return re.sub(r"\s+", " ", name)


def names_match(a: str, b: str, threshold: float = 0.85) -> bool:
    na, nb = normalize(a), normalize(b)
    if na == nb:
        return True
    if na in nb or nb in na:
        return True
    return SequenceMatcher(None, na, nb).ratio() >= threshold


def resolve_entities(nodes: list[GraphNode]) -> list[GraphNode]:
    """Deduplicate a list of nodes, merging those whose names match.

    The first occurrence is kept; later duplicates have their properties merged
    into it. Returns the deduplicated list.
    """
    canonical: list[GraphNode] = []
    id_remap: dict[str, str] = {}

    for node in nodes:
        merged = False
        for canon in canonical:
            if canon.node_type == node.node_type and names_match(canon.name, node.name):
                canon.properties.update(node.properties)
                id_remap[node.id] = canon.id
                merged = True
                break
        if not merged:
            canonical.append(node)
            id_remap[node.id] = node.id

    return canonical


def remap_relationships(
    rels: list, id_remap: dict[str, str]
) -> list:
    """Update relationship source/target IDs according to entity resolution remap."""
    for rel in rels:
        rel.source_id = id_remap.get(rel.source_id, rel.source_id)
        rel.target_id = id_remap.get(rel.target_id, rel.target_id)
    seen: set[tuple] = set()
    deduped = []
    for rel in rels:
        key = (rel.source_id, rel.target_id, rel.rel_type)
        if key not in seen:
            seen.add(key)
            deduped.append(rel)
    return deduped
