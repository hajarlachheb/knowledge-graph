"""FastAPI application — AI Knowledge Graph for Company Knowledge Management."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.db.postgres import engine
from app.db.models import Base
from app.api.deps import init_services, shutdown_services
from app.api import search, ingestion, graph, feedback

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — creating tables and connecting services …")
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
        await conn.run_sync(Base.metadata.create_all)
    await init_services()
    yield
    logger.info("Shutting down services …")
    await shutdown_services()


app = FastAPI(
    title="Knowledge Graph API",
    description="AI-powered internal knowledge graph — search, explore, and connect company knowledge.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/api")
app.include_router(ingestion.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
