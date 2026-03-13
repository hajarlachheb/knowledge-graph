# AI Knowledge Graph — Company Knowledge Management

An AI-powered internal knowledge graph that ingests content from Notion, extracts entities and relationships, stores them in a graph, and lets employees ask natural-language questions with source citations.

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- Python 3.12+
- An OpenAI API key
- A Notion integration token (with access to target pages)

### 1. Clone & configure

```bash
cp .env.example .env
# Edit .env with your actual keys:
#   OPENAI_API_KEY, NOTION_API_KEY, NOTION_ROOT_PAGE_ID
```

### 2. Start infrastructure

```bash
docker compose up -d neo4j postgres weaviate
```

This starts:
- **Neo4j** on `bolt://localhost:7687` (browser at `http://localhost:7474`)
- **PostgreSQL** on `localhost:5432`
- **Weaviate** on `http://localhost:8081`

### 3. Run the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs available at `http://localhost:8000/docs`.

### 4. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

### 5. Ingest Notion content

Trigger a full sync via the API:

```bash
curl -X POST http://localhost:8000/api/ingestion/sync
```

Or ingest a single page:

```bash
curl -X POST http://localhost:8000/api/ingestion/page/<notion-page-id>
```

### 6. Search

Go to `http://localhost:3000` and ask a question like:

> "Who worked on the recommendation system?"

The system will:
1. Embed your query and search the vector store
2. Traverse the knowledge graph for related entities
3. Combine context and generate an answer with source citations

---

## Project Structure

```
knowledge-graph/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment settings
│   │   ├── models/              # Pydantic schemas
│   │   │   ├── graph.py         # Node/Relationship types
│   │   │   ├── search.py        # Search request/response
│   │   │   └── feedback.py      # User feedback
│   │   ├── services/            # Core business logic
│   │   │   ├── notion.py        # Notion API client
│   │   │   ├── ingestion.py     # End-to-end ingestion pipeline
│   │   │   ├── extraction.py    # LLM entity/relationship extraction
│   │   │   ├── entity_resolution.py  # Deduplication
│   │   │   ├── graph_db.py      # Neo4j operations
│   │   │   ├── vector_store.py  # Weaviate operations
│   │   │   ├── embeddings.py    # OpenAI embeddings + chunking
│   │   │   └── search.py        # RAG pipeline
│   │   ├── api/                 # FastAPI routers
│   │   │   ├── search.py        # POST /api/search
│   │   │   ├── ingestion.py     # POST /api/ingestion/sync
│   │   │   ├── graph.py         # GET /api/graph/*
│   │   │   ├── feedback.py      # POST /api/feedback
│   │   │   └── deps.py          # Dependency injection
│   │   └── db/                  # PostgreSQL
│   │       ├── postgres.py      # Async engine/session
│   │       └── models.py        # SQLAlchemy ORM models
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout with nav
│   │   │   ├── page.tsx         # Search page
│   │   │   └── graph/page.tsx   # Graph explorer page
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   ├── SourceCitation.tsx
│   │   │   ├── FeedbackButtons.tsx
│   │   │   └── GraphViewer.tsx  # React Flow graph visualization
│   │   └── lib/
│   │       └── api.ts           # Backend API client
│   ├── package.json
│   └── Dockerfile
├── docs/
│   └── architecture.md          # Architecture diagram + Cypher examples
├── docker-compose.yml           # Neo4j, Postgres, Weaviate, backend, frontend
├── .env.example
└── README.md
```

## API Endpoints

| Method | Path                          | Description                              |
|--------|-------------------------------|------------------------------------------|
| POST   | `/api/search`                 | Semantic search with source citations    |
| POST   | `/api/ingestion/sync`         | Trigger full Notion sync                 |
| POST   | `/api/ingestion/page/{id}`    | Ingest a single Notion page              |
| GET    | `/api/graph/node/{id}`        | Get a single graph node                  |
| GET    | `/api/graph/search?q=`        | Search graph nodes by name               |
| GET    | `/api/graph/subgraph/{id}`    | Get subgraph around a node               |
| GET    | `/api/graph/traverse`         | Traverse from entity by relationship     |
| POST   | `/api/feedback`               | Submit thumbs up/down feedback           |
| GET    | `/health`                     | Health check                             |

## Tech Stack

| Component       | Technology                    |
|-----------------|-------------------------------|
| Graph DB        | Neo4j 5 (Cypher)              |
| Vector Store    | Weaviate                      |
| LLM / RAG       | LangChain + OpenAI GPT-4o     |
| Embeddings      | OpenAI text-embedding-3-small |
| Backend         | FastAPI (Python 3.12)         |
| Frontend        | Next.js 14 + Tailwind CSS     |
| Metadata DB     | PostgreSQL 16                 |
| Graph Viz       | React Flow + Dagre            |

## Key Design Decisions

1. **Mandatory source citations** — Every search answer must include at least one source. If no supporting documents are found, the system responds with "I don't have enough information."

2. **Incremental sync** — Documents are hashed; only changed pages are re-processed to minimize API calls and LLM costs.

3. **Entity resolution** — Fuzzy name matching deduplicates entities so "Alice", "Alice Smith", and "@alice" merge into one node.

4. **Hybrid retrieval** — Combines vector similarity search (for semantic relevance) with graph traversal (for structural connections like "who worked on what").

5. **Privacy-first** — Document permissions are stored alongside metadata; the search layer can enforce access control.

## Environment Variables

See `.env.example` for the full list. The critical ones:

| Variable              | Required | Description                   |
|-----------------------|----------|-------------------------------|
| `OPENAI_API_KEY`      | Yes      | OpenAI API key                |
| `NOTION_API_KEY`      | Yes      | Notion integration token      |
| `NOTION_ROOT_PAGE_ID` | Yes      | Root page to start ingesting  |
| `NEO4J_PASSWORD`      | Yes      | Neo4j database password       |
| `WEAVIATE_URL`        | No       | Defaults to localhost:8081    |

## Future Work (Out of MVP Scope)

- Slack ingestion (messages + threads)
- GitHub ingestion (PRs, issues, README files)
- Meeting transcript ingestion
- Expertise detection via PageRank on the graph
- Decision intelligence ("Why was this decided?")
- Advanced analytics dashboard
- Fine-tuned extraction model for higher precision
