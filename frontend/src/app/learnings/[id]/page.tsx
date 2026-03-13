"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getRexSheet, deleteRexSheet, getRelatedRex, getSummary, RexOut } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import TagBadge from "@/components/TagBadge";
import BookmarkButton from "@/components/BookmarkButton";
import RexCard from "@/components/LearningCard";

export default function RexDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [rex, setRex] = useState<RexOut | null>(null);
  const [related, setRelated] = useState<RexOut[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const id = Number(params.id);

  useEffect(() => {
    Promise.all([
      getRexSheet(id),
      getRelatedRex(id),
      getSummary(id),
    ]).then(([r, rel, sum]) => {
      setRex(r);
      setRelated(rel);
      setSummary(sum.summary);
    }).catch(() => setRex(null)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>;
  if (!rex) return <div className="text-center py-20"><p className="text-gray-500">REX sheet not found</p><Link href="/feed" className="mt-2 inline-block text-brand-600 hover:underline">Back to feed</Link></div>;

  const isOwner = user?.id === rex.author.id;
  const handleDelete = async () => {
    if (!confirm("Delete this REX sheet?")) return;
    setDeleting(true);
    try { await deleteRexSheet(rex.id); router.push("/dashboard"); } catch { setDeleting(false); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          <article className="rounded-xl border border-gray-200 bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900">{rex.title}</h1>
              <BookmarkButton rex={rex} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Link href={`/users/${rex.author.id}`} className="font-medium text-brand-600 hover:underline">
                {rex.author.full_name || rex.author.username}
              </Link>
              {rex.author.position && <span className="text-gray-400">· {rex.author.position}</span>}
              {rex.author.department && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">{rex.author.department.name}</span>}
              <span>· {new Date(rex.created_at).toLocaleDateString()}</span>
            </div>

            {rex.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">{rex.tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)}</div>
            )}

            {/* AI Summary */}
            {summary && (
              <div className="mt-6 rounded-lg bg-purple-50 border border-purple-100 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-600 mb-1.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  AI Summary
                </div>
                <p className="text-sm text-purple-900">{summary}</p>
              </div>
            )}

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500 mb-2">Problematic</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{rex.problematic}</div>
            </section>

            <section className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-green-600 mb-2">Solution</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">{rex.solution}</div>
            </section>

            {isOwner && (
              <div className="mt-8 flex gap-3 border-t border-gray-100 pt-4">
                <Link href={`/learnings/${rex.id}/edit`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Edit</Link>
                <button onClick={handleDelete} disabled={deleting} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">{deleting ? "Deleting…" : "Delete"}</button>
              </div>
            )}
          </article>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Author card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Author</h3>
            <Link href={`/users/${rex.author.id}`} className="flex items-center gap-3 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                {(rex.author.full_name || rex.author.username).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{rex.author.full_name || rex.author.username}</p>
                <p className="text-xs text-gray-500">{rex.author.position}</p>
                {rex.author.department && <p className="text-xs text-gray-400">{rex.author.department.name}</p>}
              </div>
            </Link>
            {rex.author.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {rex.author.skills.map((s) => (
                  <span key={s.id} className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">{s.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Related REX */}
          {related.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Related REX Sheets</h3>
              <div className="space-y-3">
                {related.map((r) => (
                  <Link key={r.id} href={`/learnings/${r.id}`} className="block group">
                    <p className="text-sm font-medium text-gray-900 group-hover:text-brand-600 transition-colors line-clamp-2">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.author.full_name || r.author.username}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
