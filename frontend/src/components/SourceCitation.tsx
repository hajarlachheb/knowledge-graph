"use client";

import type { SourceCitation as Source } from "@/lib/api";

interface Props {
  source: Source;
}

export function SourceCitation({ source }: Props) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {source.node_type && (
              <span className="shrink-0 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-600">
                {source.node_type}
              </span>
            )}
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-medium text-brand-600 hover:underline"
              >
                {source.title}
              </a>
            ) : (
              <span className="truncate text-sm font-medium text-gray-900">
                {source.title}
              </span>
            )}
          </div>
          {source.snippet && (
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">{source.snippet}</p>
          )}
        </div>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-gray-400 hover:text-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
