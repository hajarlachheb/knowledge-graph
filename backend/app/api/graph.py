"""Knowledge graph endpoint: returns nodes and edges with contribution-weighted sizing."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import Department, RexSheet, Skill, Tag, User, Vote
from app.models.schemas import GraphEdge, GraphNode, GraphResponse

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("", response_model=GraphResponse)
async def get_knowledge_graph(session: AsyncSession = Depends(get_session)):
    nodes: list[GraphNode] = []
    edges: list[GraphEdge] = []

    depts = (await session.execute(select(Department))).scalars().all()
    for d in depts:
        nodes.append(GraphNode(id=f"dept-{d.id}", label=d.name, type="department"))

    users = (await session.execute(
        select(User).options(
            selectinload(User.skills),
            selectinload(User.department),
            selectinload(User.rex_sheets).selectinload(RexSheet.votes_rel),
            selectinload(User.rex_sheets).selectinload(RexSheet.tags),
        )
    )).scalars().unique().all()

    for u in users:
        sheets = u.rex_sheets or []
        rex_count = len(sheets)
        total_votes = sum(sum(v.value for v in (r.votes_rel or [])) for r in sheets)
        contributor_score = total_votes + rex_count * 2

        tag_freq: dict[str, int] = {}
        for r in sheets:
            for t in (r.tags or []):
                tag_freq[t.name] = tag_freq.get(t.name, 0) + 1
        top_tags = sorted(tag_freq, key=lambda x: tag_freq[x], reverse=True)[:3]

        nodes.append(GraphNode(
            id=f"user-{u.id}",
            label=u.full_name or u.username,
            type="person",
            meta={
                "position": u.position,
                "department": u.department.name if u.department else "",
                "rex_count": str(rex_count),
                "total_votes": str(total_votes),
                "contributor_score": str(contributor_score),
                "is_trusted": str(contributor_score >= 10),
                "top_tags": ", ".join(top_tags),
            },
        ))
        if u.department:
            edges.append(GraphEdge(source=f"user-{u.id}", target=f"dept-{u.department_id}", label="belongs to"))
        for s in u.skills:
            edges.append(GraphEdge(source=f"user-{u.id}", target=f"skill-{s.id}", label="has skill"))

    skills = (await session.execute(select(Skill))).scalars().all()
    for s in skills:
        nodes.append(GraphNode(id=f"skill-{s.id}", label=s.name, type="skill"))

    tags = (await session.execute(select(Tag))).scalars().all()
    for t in tags:
        nodes.append(GraphNode(id=f"tag-{t.id}", label=t.name, type="topic"))

    rex_sheets = (await session.execute(
        select(RexSheet).options(selectinload(RexSheet.tags))
    )).scalars().unique().all()
    author_topics: set[tuple[str, str]] = set()
    for rex in rex_sheets:
        for t in rex.tags:
            key = (f"user-{rex.author_id}", f"tag-{t.id}")
            if key not in author_topics:
                author_topics.add(key)
                edges.append(GraphEdge(source=key[0], target=key[1], label="contributed to"))

    return GraphResponse(nodes=nodes, edges=edges)
