"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { aiSearch, whoKnows, aiChat, RexOut, WhoKnowsResult } from "@/lib/api";
import RexCard from "@/components/LearningCard";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  references?: { id: number; title: string }[];
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RexOut[]>([]);
  const [experts, setExperts] = useState<WhoKnowsResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const [rexResults, expertResults] = await Promise.all([
        aiSearch(query.trim()),
        whoKnows(query.trim()),
      ]);
      setResults(rexResults);
      setExperts(expertResults);
    } catch {
      setResults([]);
      setExperts([]);
    } finally {
      setSearching(false);
    }
  };

  const handleChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", text: question }]);
    setChatLoading(true);
    try {
      const res = await aiChat(question);
      setChatMessages((prev) => [...prev, { role: "assistant", text: res.answer, references: res.references }]);
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", text: "Sorry, I couldn't process that question. Please try again." }]);
    }
    setChatLoading(false);
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 text-purple-600 mb-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
          </svg>
          <span className="text-sm font-semibold uppercase tracking-wider">AI-Powered</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Ask Knowledia</h1>
        <p className="mt-1 text-gray-500">Search the knowledge base or ask questions in plain language</p>
      </div>

      <form onSubmit={handleSearch} className="mb-8 mx-auto max-w-2xl">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search REX sheets and find experts..."
            className="w-full rounded-2xl border border-gray-200 bg-white py-4 pl-12 pr-24 text-base shadow-sm focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none" />
          <button type="submit" disabled={searching}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {searching ? "Searching\u2026" : "Search"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 justify-center">
          {["transfer pricing", "VAT reconciliation", "project risk management", "DCF valuation"].map((hint) => (
            <button key={hint} type="button" onClick={() => { setQuery(hint); }}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors">
              {hint}
            </button>
          ))}
        </div>
      </form>

      {/* Conversational Q&A */}
      <div className="mx-auto max-w-2xl mb-8">
        <div className="rounded-xl border border-purple-200/60 bg-purple-50/30 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-500 mb-3 flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
            </svg>
            Ask Knowledia AI
          </p>
          {chatMessages.length > 0 && (
            <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-200 text-[10px] font-bold text-purple-700">AI</div>
                  )}
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-brand-600 text-white" : "bg-white border border-gray-200 text-gray-700"
                  }`}>
                    <p>{msg.text}</p>
                    {msg.references && msg.references.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {msg.references.map((ref) => (
                          <Link key={ref.id} href={`/learnings/${ref.id}`}
                            className="rounded bg-purple-50 px-2 py-0.5 text-[10px] text-purple-700 hover:bg-purple-100">
                            {ref.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-200 text-[10px] font-bold text-purple-700">AI</div>
                  <div className="rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-400">Thinking...</div>
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleChat} className="flex gap-2">
            <input
              type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask a question about the knowledge base..."
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-purple-400 outline-none placeholder:text-gray-400"
            />
            <button type="submit" disabled={chatLoading || !chatInput.trim()}
              className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-40 transition-colors">
              Ask
            </button>
          </form>
        </div>
      </div>

      {searching && (
        <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" /></div>
      )}

      {searched && !searching && (
        <div className="space-y-8">
          {experts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                People who know about this
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {experts.slice(0, 6).map((e) => (
                  <Link key={e.id} href={`/users/${e.id}`} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                        {e.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{e.full_name}</p>
                        <p className="text-xs text-gray-500">{e.position}</p>
                      </div>
                    </div>
                    {e.department && <p className="mt-2 text-xs text-gray-400">{e.department.name}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {e.skills.slice(0, 3).map((s) => (
                        <span key={s} className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">{s}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400">{e.rex_count} REX sheets &middot; Relevance: {e.relevance_score}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
              Relevant REX Sheets ({results.length})
            </h2>
            {results.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-12 text-center">
                <p className="text-gray-400 text-sm">No matching REX sheets found</p>
                <p className="mt-1 text-xs text-gray-400">Try different keywords or a broader question</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{results.map((r) => <RexCard key={r.id} rex={r} />)}</div>
            )}
          </section>
        </div>
      )}

      {!searched && chatMessages.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <svg className="mx-auto h-16 w-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p>Search for REX sheets, find experts, or ask the AI assistant</p>
        </div>
      )}
    </div>
  );
}
