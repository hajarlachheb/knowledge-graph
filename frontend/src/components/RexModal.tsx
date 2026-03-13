"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { RexOut, CommentOut, castVote, getRelatedRex, getSummary, deleteRexSheet, getComments, createComment, getExportRexUrl } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import TagBadge from "./TagBadge";
import BookmarkButton from "./BookmarkButton";

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  "lesson-learned": { label: "Lesson Learned", color: "bg-blue-100 text-blue-700" },
  "best-practice": { label: "Best Practice", color: "bg-green-100 text-green-700" },
  "incident": { label: "Incident", color: "bg-red-100 text-red-700" },
  "process-improvement": { label: "Process Improvement", color: "bg-amber-100 text-amber-700" },
  "technical-guide": { label: "Technical Guide", color: "bg-purple-100 text-purple-700" },
};

interface Props {
  rex: RexOut;
  onClose: () => void;
  onDeleted?: () => void;
}

export default function RexModal({ rex, onClose, onDeleted }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState("");
  const [related, setRelated] = useState<RexOut[]>([]);
  const [score, setScore] = useState(rex.vote_score);
  const [userVote, setUserVote] = useState(rex.user_vote);
  const [voting, setVoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [comments, setComments] = useState<CommentOut[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.id === rex.author.id;
  const cat = CATEGORY_CONFIG[rex.category] || CATEGORY_CONFIG["lesson-learned"];

  useEffect(() => {
    Promise.all([getSummary(rex.id), getRelatedRex(rex.id)])
      .then(([s, r]) => { setSummary(s.summary); setRelated(r); })
      .catch(() => {});
    getComments(rex.id)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [rex.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleVote = async (value: number) => {
    if (voting) return;
    setVoting(true);
    try {
      const newValue = userVote === value ? 0 : value;
      await castVote(rex.id, newValue);
      setScore(score - userVote + newValue);
      setUserVote(newValue);
    } catch { /* silent */ }
    setVoting(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this REX sheet?")) return;
    setDeleting(true);
    try {
      await deleteRexSheet(rex.id);
      onDeleted?.();
      onClose();
    } catch { setDeleting(false); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      const comment = await createComment(rex.id, text);
      setComments((prev) => [...prev, comment]);
    } catch { /* silent */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl my-8 mx-4 bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 pb-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cat.color}`}>
                {cat.label}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                {rex.view_count}
              </span>
              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
                {comments.length}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{rex.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Link href={`/users/${rex.author.id}`} className="font-medium text-brand-600 hover:underline" onClick={onClose}>
                {rex.author.full_name || rex.author.username}
              </Link>
              {rex.author.department && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                  {rex.author.department.name}
                </span>
              )}
              <span className="text-gray-300">&middot;</span>
              <span className="text-xs">{new Date(rex.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-1">
              <button onClick={() => handleVote(1)} disabled={voting}
                className={`p-1 rounded transition-colors ${userVote === 1 ? "text-green-600" : "text-gray-300 hover:text-green-500"}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                </svg>
              </button>
              <span className={`text-sm font-bold tabular-nums min-w-[20px] text-center ${score > 0 ? "text-green-600" : score < 0 ? "text-red-500" : "text-gray-400"}`}>
                {score}
              </span>
              <button onClick={() => handleVote(-1)} disabled={voting}
                className={`p-1 rounded transition-colors ${userVote === -1 ? "text-red-500" : "text-gray-300 hover:text-red-500"}`}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>

            <BookmarkButton rex={rex} />

            <a
              href={getExportRexUrl(rex.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Export as Markdown"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </a>

            <button
              onClick={() => { navigator.clipboard.writeText(window.location.origin + `/learnings/${rex.id}`); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Copy link"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </button>

            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tags */}
        {rex.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pt-3">
            {rex.tags.map((tag) => <TagBadge key={tag.id} tag={tag} />)}
          </div>
        )}

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {summary && (
            <div className="rounded-lg bg-purple-50/70 border border-purple-100 p-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-500 mb-1 flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
                TL;DR
              </p>
              <p className="text-sm text-purple-900/80">{summary}</p>
            </div>
          )}

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-1.5">Problematic</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{rex.problematic}</p>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-green-500 mb-1.5">Solution</h3>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{rex.solution}</p>
          </section>

          {isOwner && (
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Link href={`/learnings/${rex.id}/edit`} onClick={onClose}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                Edit
              </Link>
              <button onClick={handleDelete} disabled={deleting}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                {deleting ? "Deleting\u2026" : "Delete"}
              </button>
            </div>
          )}

          {related.length > 0 && (
            <section className="pt-2 border-t border-gray-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Related REX</h3>
              <div className="flex flex-wrap gap-2">
                {related.slice(0, 4).map((r) => (
                  <span key={r.id}
                    className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-1.5 text-xs text-gray-700 hover:border-brand-200 hover:text-brand-600 cursor-pointer transition-colors">
                    {r.title}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Discussion */}
        <div className="border-t border-gray-200 bg-gray-50/80 rounded-b-2xl">
          <div className="px-5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Discussion ({comments.length})
            </p>
            {loadingComments ? (
              <p className="text-xs text-gray-400 mb-2">Loading comments...</p>
            ) : comments.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto mb-2.5">
                {comments.map((m) => (
                  <div key={m.id} className="flex gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                      {(m.author.full_name || m.author.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-medium text-gray-900">{m.author.full_name || m.author.username}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {m.is_question && (
                          <span className="rounded bg-amber-100 px-1 text-[10px] font-medium text-amber-700">Question</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{m.text}</p>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            ) : (
              <p className="text-xs text-gray-400 mb-2">No comments yet. Start the discussion!</p>
            )}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Comment or ask a question..."
                className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400/30 outline-none placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
