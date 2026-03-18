"""FastAPI application — Knowledia: Corporate Knowledge Management."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.postgres import engine
from app.db.models import Base
from app.api import (
    auth, learnings, users, tags, bookmarks, departments, graph,
    dashboard, ai, votes, leaderboard, comments, notifications,
    follows, activity, export, admin,
    reactions, saved_searches, attachments, templates, collections,
    endorsements, badges, chat_threads, moderation, compliance,
    roles, shared_links, bulk_import,
)

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — creating tables …")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    logger.info("Shutting down …")
    await engine.dispose()


app = FastAPI(
    title="Knowledia API",
    description="Corporate knowledge management — REX sheets, skills mapping, knowledge graph, AI-powered search.",
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(learnings.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(bookmarks.router, prefix="/api")
app.include_router(departments.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(votes.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(follows.router, prefix="/api")
app.include_router(activity.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(reactions.router, prefix="/api")
app.include_router(saved_searches.router, prefix="/api")
app.include_router(attachments.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(collections.router, prefix="/api")
app.include_router(endorsements.router, prefix="/api")
app.include_router(badges.router, prefix="/api")
app.include_router(chat_threads.router, prefix="/api")
app.include_router(moderation.router, prefix="/api")
app.include_router(compliance.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(shared_links.router, prefix="/api")
app.include_router(bulk_import.router, prefix="/api")

from fastapi.staticfiles import StaticFiles
import os
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
