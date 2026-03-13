# Architecture — AI Knowledge Graph

## High-Level Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Notion API │────▸│  Ingestion Layer │────▸│   Storage Layer      │
│  (MVP)      │     │                  │     │                      │
│  ─ ─ ─ ─ ─ │     │  • Notion loader │     │  Neo4j  (graph)      │
│  Slack  (v2)│     │  • LLM extract   │     │  Weaviate (vectors)  │
│  GitHub (v2)│     │  • Entity resol. │     │  Postgres (metadata) │
│  Meetings   │     │  • Chunking/emb  │     │                      │
└─────────────┘     └──────────────────┘     └──────────┬───────────┘
                                                        │
                                              ┌─────────▼──────────┐
                                              │   Search / RAG     │
                                              │                    │
                                              │  • Embed query     │
                                              │  • Vector search   │
                                              │  • Graph traversal │
                                              │  • LLM synthesis   │
                                              │  • Source citation  │
                                              └─────────┬──────────┘
                                                        │
                                              ┌─────────▼──────────┐
                                              │   FastAPI Backend   │
                                              │                    │
                                              │  /api/search       │
                                              │  /api/ingestion    │
                                              │  /api/graph        │
                                              │  /api/feedback     │
                                              └─────────┬──────────┘
                                                        │
                                              ┌─────────▼──────────┐
                                              │   Next.js Frontend │
                                              │                    │
                                              │  Search page       │
                                              │  Graph explorer    │
                                              │  Feedback buttons  │
                                              └────────────────────┘
```

## Knowledge Graph Schema

### Node Types

| Label       | Key Properties                                    |
|-------------|---------------------------------------------------|
| Person      | id, name, role, email                             |
| Project     | id, name, status, description                     |
| Document    | id, name, source_url, source_doc_id               |
| Decision    | id, name, date, rationale                         |
| Meeting     | id, name, date, attendees                         |
| CodeRepo    | id, name, url, language                           |
| Product     | id, name, status                                  |
| Team        | id, name, department                              |
| Technology  | id, name, category                                |
| Concept     | id, name, description                             |

### Relationship Types

| Type          | Typical Direction                       |
|---------------|-----------------------------------------|
| AUTHORED      | Person → Document                       |
| WORKED_ON     | Person → Project                        |
| DECIDED       | Person → Decision                       |
| RELATED_TO    | any ↔ any                               |
| DEPENDS_ON    | Project → Project / Technology          |
| PRESENTED_AT  | Person → Meeting                        |
| EXPERT_IN     | Person → Technology / Concept           |
| MENTIONED_IN  | Entity → Document                       |
| SUPERSEDED_BY | Decision → Decision                     |
| CONTAINS      | Document → Decision / Concept           |
| DISCUSSED     | Meeting → Decision / Topic              |
| ENABLES       | Decision → Feature / Project            |
| BELONGS_TO    | Person → Team                           |

## Example Cypher Queries

### Who worked on a project?

```cypher
MATCH (p:Person)-[:WORKED_ON]->(proj:Project)
WHERE toLower(proj.name) CONTAINS 'recommendation'
RETURN p.name AS person, proj.name AS project
```

### What decisions relate to a topic?

```cypher
MATCH (d:Decision)-[:RELATED_TO|MENTIONED_IN*1..2]-(topic)
WHERE toLower(topic.name) CONTAINS 'data pipeline'
RETURN d.name AS decision, d.date, labels(topic)[0] AS related_type, topic.name
```

### Full neighborhood of a document

```cypher
MATCH path = (doc:Document {id: $docId})-[*1..2]-(neighbor)
RETURN nodes(path), relationships(path)
```

### Expertise map

```cypher
MATCH (p:Person)-[:EXPERT_IN]->(t:Technology)
RETURN p.name, collect(t.name) AS skills
ORDER BY size(collect(t.name)) DESC
```
