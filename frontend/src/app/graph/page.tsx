"use client";

import { useState } from "react";
import { GraphViewer } from "@/components/GraphViewer";
import { searchNodes, getSubgraph, type SubgraphResponse } from "@/lib/api";

export default function GraphPage() {
  const [query, setQuery] = useState("");
  const [nodes, setNodes] = useState<Record<string, unknown>[]>([]);
  const [graph, setGraph] = useState<SubgraphResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleNodeSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const results = await searchNodes(query);
      setNodes(results);
      setGraph(null);
    } catch {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (nodeId: string) => {
    setLoading(true);
    try {
      const sub = await getSubgraph(nodeId, 2);
      setGraph(sub);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Explore the Knowledge Graph</h1>
      <p className="mt-1 text-sm text-gray-500">
        Search for an entity, then click to view its neighborhood in the graph.
      </p>

      {/* Search bar */}
      <div className="mt-6 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleNodeSearch()}
          placeholder="Search entities (people, projects, technologies …)"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          onClick={handleNodeSearch}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow transition hover:bg-brand-700 disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {/* Node list */}
      {nodes.length > 0 && !graph && (
        <div className="mt-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Matching Entities</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {nodes.map((n, i) => {
              const labels = (n.labels as string[]) || [];
              const nodeId = (n.id as string) || `node-${i}`;
              return (
                <button
                  key={nodeId}
                  onClick={() => handleNodeClick(nodeId)}
                  className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-500 hover:shadow"
                >
                  <span className="text-xs font-medium text-brand-600">
                    {labels.join(", ") || "Entity"}
                  </span>
                  <span className="mt-0.5 font-medium text-gray-900">
                    {n.name as string}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Graph visualization */}
      {graph && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Graph View ({graph.nodes.length} nodes, {graph.edges.length} edges)
            </h2>
            <button
              onClick={() => setGraph(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ← Back to list
            </button>
          </div>
          <div className="h-[600px] rounded-lg border border-gray-200 bg-white shadow">
            <GraphViewer subgraph={graph} onNodeClick={handleNodeClick} />
          </div>
        </div>
      )}

      {/* Empty state */}
      {nodes.length === 0 && !graph && !loading && (
        <div className="mt-16 text-center text-gray-400 text-sm">
          Search for an entity to start exploring the graph.
        </div>
      )}
    </div>
  );
}
