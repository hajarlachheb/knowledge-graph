"use client";

import { useState } from "react";
import { FeedbackButtons } from "./FeedbackButtons";
import { SourceCitation } from "./SourceCitation";
import type { SearchResponse } from "@/lib/api";

interface Props {
  result: SearchResponse;
  query: string;
}

export function SearchResults({ result, query }: Props) {
  const [expanded, setExpanded] = useState(false);
  const confidenceLabel =
    result.confidence >= 0.7
      ? "High confidence"
      : result.confidence >= 0.4
        ? "Medium confidence"
        : "Low confidence";
  const confidenceColor =
    result.confidence >= 0.7
      ? "text-green-600 bg-green-50"
      : result.confidence >= 0.4
        ? "text-yellow-600 bg-yellow-50"
        : "text-red-600 bg-red-50";

  return (
    <div className="space-y-6">
      {/* Answer card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Answer
          </h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${confidenceColor}`}
          >
            {confidenceLabel}
          </span>
        </div>

        <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">
          {result.answer}
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4">
          <FeedbackButtons query={query} answer={result.answer} />
        </div>
      </div>

      {/* Sources */}
      {result.sources.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Sources ({result.sources.length})
          </h2>
          <div className="space-y-2">
            {result.sources.map((src, i) => (
              <SourceCitation key={i} source={src} />
            ))}
          </div>
        </div>
      )}

      {/* Graph context (collapsible) */}
      {result.graph_context.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
          >
            <svg
              className={`h-4 w-4 transition ${expanded ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
            Graph Context ({result.graph_context.length} connections)
          </button>
          {expanded && (
            <div className="mt-2 space-y-1">
              {result.graph_context.map((g, i) => {
                const from = (g.from as Record<string, string>)?.name || "?";
                const rel = (g.relationship as string) || "?";
                const to = (g.to as Record<string, string>)?.name || "?";
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded bg-gray-50 px-3 py-1.5 text-xs text-gray-700"
                  >
                    <span className="font-medium">{from}</span>
                    <span className="text-gray-400">→</span>
                    <span className="rounded bg-brand-50 px-1.5 py-0.5 text-brand-700">{rel}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium">{to}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
