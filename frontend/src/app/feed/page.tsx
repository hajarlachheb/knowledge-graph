"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getRexSheets, getDepartments, RexOut, DepartmentOut } from "@/lib/api";
import RexCard from "@/components/LearningCard";

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "lesson-learned", label: "Lesson Learned" },
  { value: "best-practice", label: "Best Practice" },
  { value: "incident", label: "Incident" },
  { value: "process-improvement", label: "Process Improvement" },
  { value: "technical-guide", label: "Technical Guide" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most_voted", label: "Most Voted" },
  { value: "most_viewed", label: "Most Viewed" },
];

function FeedContent() {
  const searchParams = useSearchParams();
  const tagFilter = searchParams.get("tag") || "";

  const [sheets, setSheets] = useState<RexOut[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<DepartmentOut[]>([]);
  const [deptFilter, setDeptFilter] = useState<number | undefined>();
  const [catFilter, setCatFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    getDepartments().then(setDepartments).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRexSheets({
        page,
        tag: tagFilter || undefined,
        q: search || undefined,
        department_id: deptFilter,
        category: catFilter || undefined,
        sort: sortBy,
      });
      setSheets(data.items);
      setTotal(data.total);
    } catch { /* silent */ } finally { setLoading(false); }
  }, [page, tagFilter, search, deptFilter, catFilter, sortBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(query); setPage(1); };
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="max-w-[1100px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tagFilter ? (<>REX Sheets <span className="text-brand-600">#{tagFilter}</span></>) : "REX Sheets"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Browse experience entries across the company</p>
        </div>
        <span className="text-xs text-gray-400">{total} entries</span>
      </div>

      <form onSubmit={handleSearch} className="mb-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter REX sheets\u2026"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none" />
        </div>
      </form>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select
          value={deptFilter || ""}
          onChange={(e) => { setDeptFilter(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-600 focus:border-brand-500 outline-none"
        >
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-600 focus:border-brand-500 outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] text-gray-600 focus:border-brand-500 outline-none"
        >
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>
      ) : sheets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">No REX sheets found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sheets.map((r) => <RexCard key={r.id} rex={r} onBookmarkChange={fetchData} />)}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">Previous</button>
              <span className="flex items-center px-3 text-sm text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-gray-50 transition-colors">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>}>
      <FeedContent />
    </Suspense>
  );
}
