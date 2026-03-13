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


@app.get("/health")
async def health():
    return {"status": "ok"}
