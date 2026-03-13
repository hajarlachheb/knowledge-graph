"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboard, getLeaderboard, DashboardData, ContributorOut } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import RexCard from "@/components/LearningCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [leaders, setLeaders] = useState<ContributorOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getLeaderboard()])
      .then(([d, l]) => { setData(d); setLeaders(l); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !user) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.full_name?.split(" ")[0] || user.username}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {user.position}{user.department ? ` · ${user.department.name}` : ""}
        </p>
      </div>

      {/* Stats row */}
      {data && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "My REX", value: data.stats.my_rex_count, color: "text-brand-600" },
            { label: "Saved", value: data.stats.my_bookmark_count, color: "text-yellow-600" },
            { label: "Total REX", value: data.stats.total_rex, color: "text-green-600" },
            { label: "Members", value: data.stats.total_users, color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white border border-gray-200/80 p-3.5 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="flex gap-2 mb-6">
        <Link href="/learnings/new" className="flex items-center gap-2 rounded-lg bg-brand-600 text-white px-4 py-2 text-sm font-medium hover:bg-brand-700 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New REX
        </Link>
        <Link href="/search" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
          Ask Knowledia
        </Link>
        <Link href="/graph" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
          Graph
        </Link>
      </div>

      {data && (
        <div className="space-y-8">
          {/* My REX Sheets */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">My REX Sheets</h2>
              <Link href={`/users/${user.id}`} className="text-xs text-brand-600 hover:underline">View all</Link>
            </div>
            {data.my_rex_sheets.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
                <p className="text-gray-400 text-sm">No REX sheets yet</p>
                <Link href="/learnings/new" className="mt-1 inline-block text-sm text-brand-600 hover:underline font-medium">Write your first one</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.my_rex_sheets.map((r) => <RexCard key={r.id} rex={r} />)}
              </div>
            )}
          </section>

          {/* Department Feed */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">
                {user.department ? `From ${user.department.name}` : "From your colleagues"}
              </h2>
              <Link href="/feed" className="text-xs text-brand-600 hover:underline">See all</Link>
            </div>
            {data.department_feed.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
                <p className="text-gray-400 text-sm">No REX sheets from your department yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.department_feed.map((r) => <RexCard key={r.id} rex={r} />)}
              </div>
            )}
          </section>

          {/* Top Contributors */}
          {leaders.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                Top Contributors
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {leaders.slice(0, 6).map((c, i) => (
                  <Link key={c.id} href={`/users/${c.id}`}
                    className="rounded-xl border border-gray-200/80 bg-white p-3 hover:shadow-md transition-shadow text-center relative">
                    {i < 3 && (
                      <span className={`absolute -top-1.5 -right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow text-white ${
                        i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : "bg-amber-600"
                      }`}>#{i + 1}</span>
                    )}
                    <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      c.is_trusted ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400" : "bg-brand-100 text-brand-700"
                    }`}>
                      {c.full_name.charAt(0).toUpperCase()}
                    </div>
                    <p className="mt-1.5 text-xs font-semibold text-gray-900 truncate">
                      {c.full_name.split(" ")[0]}
                      {c.is_trusted && <span className="ml-0.5 text-yellow-500">⭐</span>}
                    </p>
                    <p className="text-[10px] text-green-600 font-medium">{c.contributor_score} pts</p>
                    {c.top_tags.length > 0 && (
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{c.top_tags[0]}</p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recommended */}
          {data.recommended.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <svg className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                Recommended for you
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.recommended.slice(0, 4).map((r) => <RexCard key={r.id} rex={r} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
