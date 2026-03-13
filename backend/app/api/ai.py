"""AI-powered endpoints: smart search, summaries, tag suggestions, related REX, Q&A chat."""

from __future__ import annotations

import re
from collections import Counter

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.postgres import get_session
from app.db.models import Bookmark, RexSheet, RexTag, Tag, User
from app.models.schemas import RexOut, DepartmentOut, SkillOut, TagOut, UserOut
from app.api.deps import get_current_user, get_optional_user
from app.api.learnings import _rex_to_out, _rex_query
from app.llm import get_llm_provider

router = APIRouter(prefix="/ai", tags=["ai"])


def _extract_keywords(text: str) -> list[str]:
    stop = {"the", "a", "an", "is", "was", "were", "are", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "shall",
            "should", "may", "might", "can", "could", "to", "of", "in", "for",
            "on", "with", "at", "by", "from", "as", "into", "about", "like",
            "through", "after", "over", "between", "out", "up", "that", "this",
            "it", "its", "and", "or", "but", "not", "no", "so", "if", "then",
            "than", "too", "very", "just", "how", "what", "when", "where", "who",
            "which", "why", "we", "our", "they", "their", "i", "my", "me", "he",
            "she", "him", "her", "you", "your"}
    words = re.findall(r'\b[a-z]{3,}\b', text.lower())
    return [w for w in words if w not in stop]


def _score_rex(rex: RexSheet, keywords: list[str]) -> float:
    text = f"{rex.title} {rex.problematic} {rex.solution}".lower()
    tag_text = " ".join(t.name for t in (rex.tags or []))
    score = 0.0
    for kw in keywords:
        if kw in rex.title.lower():
            score += 5.0
        if kw in tag_text:
            score += 3.0
        count = text.count(kw)
        score += min(count * 0.5, 3.0)
    return score


def _suggest_tags_heuristic(title: str, problematic: str, solution: str) -> list[str]:
    text = f"{title} {problematic} {solution}".lower()
    keywords = _extract_keywords(text)
    freq = Counter(keywords)
    tech_terms = {
        "python", "javascript", "react", "docker", "aws", "kafka", "sql",
        "postgresql", "redis", "kubernetes", "api", "microservices", "devops",
        "frontend", "backend", "database", "cloud", "machine", "learning",
        "data", "analytics", "security", "testing", "deployment", "agile",
        "scrum", "performance", "optimization", "automation", "monitoring",
        "sap", "excel", "power", "tableau", "oracle", "ifrs", "gaap",
    }
    domain_terms = {
        "tax", "vat", "audit", "compliance", "risk", "finance", "valuation",
        "merger", "acquisition", "governance", "pmo", "project", "budget",
        "kyc", "aml", "sox", "provision", "transfer", "pricing",
        "reconciliation", "invoice", "revenue", "hedging", "currency",
    }
    suggestions = []
    for word, count in freq.most_common(20):
        if word in tech_terms or word in domain_terms:
            suggestions.append(word)
        elif count >= 3 and len(word) > 4:
            suggestions.append(word)
    return suggestions[:8]


@router.get("/search", response_model=list[RexOut])
async def smart_search(
    q: str = Query(..., min_length=2),
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_user),
):
    result = await session.execute(_rex_query().where(RexSheet.status == "published"))
    all_rex = list(result.scalars().unique().all())

    llm = get_llm_provider()
    keywords = _extract_keywords(q)
    if not keywords:
        return []

    scored = [(rex, _score_rex(rex, keywords)) for rex in all_rex]
    scored = [(r, s) for r, s in scored if s > 0]
    scored.sort(key=lambda x: x[1], reverse=True)

    uid = current_user.id if current_user else None
    return [_rex_to_out(r, uid) for r, _ in scored[:10]]


@router.get("/related/{rex_id}", response_model=list[RexOut])
async def get_related(
    rex_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_optional_user),
):
    result = await session.execute(_rex_query().where(RexSheet.id == rex_id))
    target = result.scalar_one_or_none()
    if not target:
        return []

    target_tag_ids = {t.id for t in (target.tags or [])}
    target_keywords = set(_extract_keywords(f"{target.title} {target.problematic}"))

    all_result = await session.execute(_rex_query().where(RexSheet.id != rex_id, RexSheet.status == "published"))
    others = all_result.scalars().unique().all()

    scored = []
    for rex in others:
        score = 0.0
        rex_tag_ids = {t.id for t in (rex.tags or [])}
        shared_tags = len(target_tag_ids & rex_tag_ids)
        score += shared_tags * 4.0
        if rex.author_id == target.author_id:
            score += 1.0
        rex_keywords = set(_extract_keywords(f"{rex.title} {rex.problematic}"))
        shared_kw = len(target_keywords & rex_keywords)
        score += min(shared_kw * 0.3, 3.0)
        if score > 0:
            scored.append((rex, score))

    scored.sort(key=lambda x: x[1], reverse=True)
    uid = current_user.id if current_user else None
    return [_rex_to_out(r, uid) for r, _ in scored[:5]]


@router.get("/summary/{rex_id}")
async def get_summary(rex_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(RexSheet).where(RexSheet.id == rex_id))
    rex = result.scalar_one_or_none()
    if not rex:
        return {"summary": ""}

    llm = get_llm_provider()
    summary = await llm.summarize(rex.title, rex.problematic, rex.solution)
    return {"summary": summary}


@router.post("/suggest-tags")
async def suggest_tags(body: dict):
    title = body.get("title", "")
    problematic = body.get("problematic", "")
    solution = body.get("solution", "")

    llm = get_llm_provider()
    tags = await llm.suggest_tags(title, problematic, solution)
    if not tags:
        tags = _suggest_tags_heuristic(title, problematic, solution)
    return {"tags": tags}


@router.post("/chat")
async def ai_chat(
    body: dict,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """RAG-powered conversational Q&A: retrieves relevant REX sheets then answers with Llama."""
    question = body.get("question", "").strip()
    if not question:
        return {"answer": "Please provide a question."}

    # ── Retrieval: score ALL published REX sheets against the query ──────────
    keywords = _extract_keywords(question)
    result = await session.execute(_rex_query().where(RexSheet.status == "published"))
    all_rex = list(result.scalars().unique().all())

    if not keywords:
        # No keywords — fall back to most-voted recent REX as context
        all_rex_sorted = sorted(all_rex, key=lambda r: r.upvotes - r.downvotes, reverse=True)
        top_rex = all_rex_sorted[:8]
        scored_pairs = [(r, 1.0) for r in top_rex]
    else:
        scored_pairs = [(rex, _score_rex(rex, keywords)) for rex in all_rex]
        scored_pairs = [(r, s) for r, s in scored_pairs if s > 0]
        scored_pairs.sort(key=lambda x: x[1], reverse=True)

    # ── Build rich context documents for Llama ────────────────────────────────
    context = []
    for r, score in scored_pairs[:8]:
        tags = ", ".join(t.name for t in (r.tags or [])) or "none"
        dept = r.author.department.name if (r.author and r.author.department) else "unknown"
        author_name = r.author.full_name or r.author.username if r.author else "unknown"
        context.append({
            "id": r.id,
            "title": r.title,
            "author": author_name,
            "department": dept,
            "category": r.category or "general",
            "tags": tags,
            "problematic": r.problematic,
            "solution": r.solution,
            "score": score,
        })

    # ── Generate answer with Llama ────────────────────────────────────────────
    llm = get_llm_provider()
    answer = await llm.chat(question, context)

    # Return top-3 sources for the frontend to display
    rex_refs = [
        {"id": c["id"], "title": c["title"], "author": c["author"], "department": c["department"]}
        for c in context[:3]
    ]
    return {"answer": answer, "references": rex_refs}


@router.get("/who-knows")
async def who_knows(
    topic: str = Query(..., min_length=2),
    session: AsyncSession = Depends(get_session),
):
    topic_lower = topic.lower()
    keywords = _extract_keywords(topic)

    users_result = await session.execute(
        select(User).options(
            selectinload(User.skills),
            selectinload(User.department),
            selectinload(User.rex_sheets).selectinload(RexSheet.tags),
        )
    )
    users = users_result.scalars().unique().all()

    scored = []
    for u in users:
        score = 0.0
        for s in (u.skills or []):
            if topic_lower in s.name.lower():
                score += 5.0
            for kw in keywords:
                if kw in s.name.lower():
                    score += 2.0
        for rex in (u.rex_sheets or []):
            for t in (rex.tags or []):
                if topic_lower in t.name.lower():
                    score += 3.0
                for kw in keywords:
                    if kw in t.name.lower():
                        score += 1.0
            for kw in keywords:
                if kw in rex.title.lower():
                    score += 1.5
        if score > 0:
            dept = None
            if u.department:
                dept = {"id": u.department.id, "name": u.department.name}
            scored.append({
                "id": u.id,
                "full_name": u.full_name or u.username,
                "position": u.position,
                "department": dept,
                "skills": [s.name for s in (u.skills or [])],
                "relevance_score": round(score, 1),
                "rex_count": len(u.rex_sheets or []),
            })

    scored.sort(key=lambda x: x["relevance_score"], reverse=True)
    return scored[:10]
