"use client";

import { useEffect, useState, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { getKnowledgeGraph, GraphNode, GraphEdge } from "@/lib/api";

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  department: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af" },
  person:     { bg: "#fef3c7", border: "#f59e0b", text: "#92400e" },
  skill:      { bg: "#d1fae5", border: "#10b981", text: "#065f46" },
  topic:      { bg: "#ede9fe", border: "#8b5cf6", text: "#5b21b6" },
};

function buildLayout(apiNodes: GraphNode[], apiEdges: GraphEdge[]) {
  const depts = apiNodes.filter((n) => n.type === "department");
  const people = apiNodes.filter((n) => n.type === "person");
  const skills = apiNodes.filter((n) => n.type === "skill");
  const topics = apiNodes.filter((n) => n.type === "topic");

  const maxScore = Math.max(1, ...people.map((p) => parseInt(p.meta?.contributor_score || "0", 10)));

  const toNode = (n: GraphNode, x: number, y: number): Node => {
    const c = NODE_COLORS[n.type] || NODE_COLORS.topic;
    const score = parseInt(n.meta?.contributor_score || "0", 10);
    const isTrusted = n.meta?.is_trusted === "True";

    let size = "10px 16px";
    let fontSize = "12px";
    let minWidth: string | undefined;
    let borderRadius = "20px";
    let borderWidth = "2px";
    let fontWeight = 500;

    if (n.type === "department") {
      borderRadius = "12px";
      fontSize = "14px";
      fontWeight = 700;
    } else if (n.type === "person") {
      borderRadius = "50%";
      const sizeRatio = score / maxScore;
      const nodeSize = 60 + sizeRatio * 80;
      minWidth = `${nodeSize}px`;
      size = `${12 + sizeRatio * 16}px ${8 + sizeRatio * 8}px`;
      fontSize = `${10 + sizeRatio * 4}px`;
      fontWeight = score > 10 ? 700 : 500;
      borderWidth = isTrusted ? "3px" : "2px";
    }

    return {
      id: n.id,
      data: {
        label: n.type === "person" && isTrusted ? `⭐ ${n.label}` : n.label,
      },
      position: { x, y },
      style: {
        background: c.bg,
        border: `${borderWidth} solid ${isTrusted && n.type === "person" ? "#f59e0b" : c.border}`,
        color: c.text,
        borderRadius,
        padding: size,
        fontSize,
        fontWeight,
        minWidth,
        textAlign: "center" as const,
        boxShadow: isTrusted && n.type === "person" ? "0 0 12px rgba(245, 158, 11, 0.4)" : undefined,
      },
    };
  };

  const nodes: Node[] = [];
  const cx = 600;

  depts.forEach((d, i) => nodes.push(toNode(d, cx + (i - (depts.length - 1) / 2) * 220, 40)));

  const personByDept: Record<string, GraphNode[]> = {};
  const personEdges = apiEdges.filter((e) => e.label === "belongs to");
  for (const p of people) {
    const deptEdge = personEdges.find((e) => e.source === p.id);
    const dk = deptEdge?.target || "none";
    if (!personByDept[dk]) personByDept[dk] = [];
    personByDept[dk].push(p);
  }

  for (const dk of Object.keys(personByDept)) {
    personByDept[dk].sort((a, b) => {
      const sa = parseInt(a.meta?.contributor_score || "0", 10);
      const sb = parseInt(b.meta?.contributor_score || "0", 10);
      return sb - sa;
    });
  }

  let col = 0;
  for (const dk of Object.keys(personByDept)) {
    const group = personByDept[dk];
    group.forEach((p, i) => {
      nodes.push(toNode(p, 80 + col * 200, 200 + i * 120));
    });
    col++;
  }

  const maxPeopleInCol = Object.values(personByDept).reduce((m, g) => Math.max(m, g.length), 0);

  skills.forEach((s, i) => {
    const row = Math.floor(i / 6);
    const cIdx = i % 6;
    nodes.push(toNode(s, 80 + cIdx * 200, 200 + maxPeopleInCol * 120 + 80 + row * 70));
  });

  topics.forEach((t, i) => {
    const row = Math.floor(i / 5);
    const cIdx = i % 5;
    const baseY = 200 + maxPeopleInCol * 120 + 80 + Math.ceil(skills.length / 6) * 70 + 60;
    nodes.push(toNode(t, 120 + cIdx * 230, baseY + row * 70));
  });

  const edges: Edge[] = apiEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "default",
    animated: e.label === "contributed to",
    style: { stroke: e.label === "belongs to" ? "#3b82f6" : e.label === "has skill" ? "#10b981" : "#8b5cf6", strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: "#6b7280" },
    markerEnd: { type: MarkerType.ArrowClosed, width: 12, height: 12 },
  }));

  return { nodes, edges };
}

export default function GraphPage() {
  const [apiNodes, setApiNodes] = useState<GraphNode[]>([]);
  const [apiEdges, setApiEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    getKnowledgeGraph()
      .then((g) => { setApiNodes(g.nodes); setApiEdges(g.edges); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredNodes = useMemo(() => {
    if (filter === "all") return apiNodes;
    if (filter === "people-skills") return apiNodes.filter((n) => n.type === "person" || n.type === "skill");
    if (filter === "people-depts") return apiNodes.filter((n) => n.type === "person" || n.type === "department");
    if (filter === "knowledge") return apiNodes.filter((n) => n.type === "person" || n.type === "topic");
    return apiNodes;
  }, [apiNodes, filter]);

  const filteredIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);
  const filteredEdges = useMemo(() => apiEdges.filter((e) => filteredIds.has(e.source) && filteredIds.has(e.target)), [apiEdges, filteredIds]);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildLayout(filteredNodes, filteredEdges), [filteredNodes, filteredEdges]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(initialNodes); setEdges(initialEdges); }, [initialNodes, initialEdges, setNodes, setEdges]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Knowledge Graph</h1>
          <p className="mt-1 text-gray-500">Node size reflects contribution score — bigger circle = more trusted contributor</p>
        </div>
        <div className="flex gap-2">
          {[
            { key: "all", label: "All" },
            { key: "people-depts", label: "Org chart" },
            { key: "people-skills", label: "Skills" },
            { key: "knowledge", label: "Knowledge" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`rounded-full px-3 py-1 text-sm border transition-colors ${filter === f.key ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-600 hover:border-brand-500"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        {Object.entries(NODE_COLORS).map(([type, c]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: c.border }} />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-yellow-600">
          <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" />
          Trusted contributor (golden border + star)
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white" style={{ height: "70vh" }}>
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView attributionPosition="bottom-left">
          <Background />
          <Controls />
          <MiniMap nodeColor={(n) => {
            const type = apiNodes.find((an) => an.id === n.id)?.type || "topic";
            return NODE_COLORS[type]?.border || "#8b5cf6";
          }} />
        </ReactFlow>
      </div>
    </div>
  );
}
