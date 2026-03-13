const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SourceCitation {
  title: string;
  url: string | null;
  snippet: string;
  node_type: string | null;
  doc_id: string | null;
}

export interface SearchResponse {
  answer: string;
  sources: SourceCitation[];
  confidence: number;
  graph_context: Record<string, unknown>[];
}

export interface SubgraphResponse {
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}

export interface FeedbackPayload {
  query: string;
  answer: string;
  rating: "up" | "down";
  comment?: string;
}

export async function searchKnowledge(
  query: string,
  topK = 5
): Promise<SearchResponse> {
  const res = await fetch(`${BASE}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK }),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function getSubgraph(
  nodeId: string,
  depth = 1
): Promise<SubgraphResponse> {
  const res = await fetch(
    `${BASE}/api/graph/subgraph/${encodeURIComponent(nodeId)}?depth=${depth}`
  );
  if (!res.ok) throw new Error(`Subgraph failed: ${res.status}`);
  return res.json();
}

export async function searchNodes(
  q: string,
  limit = 10
): Promise<Record<string, unknown>[]> {
  const res = await fetch(
    `${BASE}/api/graph/search?q=${encodeURIComponent(q)}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`Node search failed: ${res.status}`);
  return res.json();
}

export async function submitFeedback(payload: FeedbackPayload): Promise<void> {
  await fetch(`${BASE}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function triggerSync(): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/api/ingestion/sync`, { method: "POST" });
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
  return res.json();
}
