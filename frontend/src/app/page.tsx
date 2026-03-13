"use client";

import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SearchResults } from "@/components/SearchResults";
import { searchKnowledge, type SearchResponse } from "@/lib/api";

export default function HomePage() {
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    setQuery(q);
    setLoading(true);
    setError(null);
    try {
      const data = await searchKnowledge(q);
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Hero */}
      <div className="mt-8 mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Company Knowledge Search
        </h1>
        <p className="mt-3 text-lg text-gray-500">
          Ask anything about projects, people, decisions, and documents.
        </p>
      </div>

      {/* Search */}
      <div className="w-full max-w-2xl">
        <SearchBar onSearch={handleSearch} loading={loading} />
      </div>

      {/* Results */}
      {error && (
        <div className="mt-6 w-full max-w-3xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-8 w-full max-w-3xl">
          <SearchResults result={result} query={query} />
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="mt-16 text-center text-gray-400">
          <p className="text-sm">Try asking:</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {[
              "Who worked on the recommendation system?",
              "What decisions were made about the data pipeline?",
              "What technologies does the auth team use?",
            ].map((q) => (
              <button
                key={q}
                onClick={() => handleSearch(q)}
                className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-600 shadow-sm transition hover:border-brand-500 hover:text-brand-600"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
