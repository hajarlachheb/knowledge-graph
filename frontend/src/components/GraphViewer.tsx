"use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
  Position,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

import type { SubgraphResponse } from "@/lib/api";

const NODE_WIDTH = 172;
const NODE_HEIGHT = 36;

const NODE_COLORS: Record<string, string> = {
  Person: "#3b82f6",
  Project: "#10b981",
  Document: "#f59e0b",
  Decision: "#ef4444",
  Meeting: "#8b5cf6",
  CodeRepo: "#6366f1",
  Product: "#ec4899",
  Team: "#14b8a6",
  Technology: "#f97316",
  Concept: "#64748b",
};

function layoutGraph(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 120 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      return {
        ...n,
        position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      };
    }),
    edges,
  };
}

interface Props {
  subgraph: SubgraphResponse;
  onNodeClick?: (nodeId: string) => void;
}

export function GraphViewer({ subgraph, onNodeClick }: Props) {
  const { flowNodes, flowEdges } = useMemo(() => {
    const rawNodes: Node[] = subgraph.nodes.map((n) => {
      const labels = (n.labels as string[]) || [];
      const label = labels[0] || "Entity";
      const color = NODE_COLORS[label] || "#94a3b8";
      return {
        id: (n.id as string) || String(Math.random()),
        data: {
          label: (n.name as string) || (n.id as string) || "?",
        },
        position: { x: 0, y: 0 },
        style: {
          background: color + "18",
          border: `2px solid ${color}`,
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 600,
          color: "#1e293b",
        },
      };
    });

    const rawEdges: Edge[] = subgraph.edges.map((e, i) => ({
      id: `e-${i}`,
      source: (e.source as string) || "",
      target: (e.target as string) || "",
      label: (e.type as string) || "",
      animated: false,
      style: { stroke: "#94a3b8" },
      labelStyle: { fontSize: 10, fill: "#64748b" },
    }));

    const laid = layoutGraph(rawNodes, rawEdges);
    return { flowNodes: laid.nodes, flowEdges: laid.edges };
  }, [subgraph]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => onNodeClick?.(node.id),
    [onNodeClick]
  );

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      onNodeClick={handleNodeClick}
      fitView
      proOptions={{ hideAttribution: true }}
    >
      <Background />
      <Controls />
      <MiniMap
        nodeColor={(n) => {
          const border = n.style?.border as string;
          return border?.match(/#[0-9a-f]{6}/)?.[0] || "#94a3b8";
        }}
      />
    </ReactFlow>
  );
}
