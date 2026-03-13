"use client";

import { useState } from "react";
import { RexOut, castVote } from "@/lib/api";
import RexModal from "./RexModal";

const CATEGORY_COLORS: Record<string, string> = {
  "lesson-learned": "bg-blue-500",
  "best-practice": "bg-green-500",
  "incident": "bg-red-500",
  "process-improvement": "bg-amber-500",
  "technical-guide": "bg-purple-500",
};

interface Props {
  rex: RexOut;
  onBookmarkChange?: () => void;
}

export default function RexCard({ rex, onBookmarkChange }: Props) {
  const [score, setScore] = useState(rex.vote_score);
  const [userVote, setUserVote] = useState(rex.user_vote);
  const [voting, setVoting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleVote = async (e: React.MouseEvent, value: number) => {
    e.stopPropagation();
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

  const catColor = CATEGORY_COLORS[rex.category] || "bg-gray-500";

  return (
    <>
      <article
        onClick={() => setShowModal(true)}
        className="group relative flex flex-col justify-between rounded-xl border border-gray-200/80 bg-white p-4 cursor-pointer hover:shadow-md hover:border-gray-300/80 transition-all aspect-square"
      >
        {/* Top: category dot + vote */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${catColor}`} />
            <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
              {rex.author.department?.name || "General"}
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={(e) => handleVote(e, 1)} disabled={voting}
              className={`p-0.5 rounded transition-colors ${userVote === 1 ? "text-green-600" : "text-gray-300 hover:text-green-500"}`}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
              </svg>
            </button>
            <span className={`text-xs font-bold tabular-nums min-w-[16px] text-center ${score > 0 ? "text-green-600" : score < 0 ? "text-red-500" : "text-gray-400"}`}>
              {score}
            </span>
            <button onClick={(e) => handleVote(e, -1)} disabled={voting}
              className={`p-0.5 rounded transition-colors ${userVote === -1 ? "text-red-500" : "text-gray-300 hover:text-red-500"}`}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="flex-1 flex flex-col justify-center">
          <h3 className="text-[14px] font-semibold text-gray-900 leading-snug line-clamp-3 group-hover:text-brand-700 transition-colors">
            {rex.title}
          </h3>
        </div>

        {/* Bottom: author + tags + stats */}
        <div className="mt-auto pt-2">
          {rex.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {rex.tags.slice(0, 2).map((tag) => (
                <span key={tag.id} className="rounded-full bg-gray-100 px-2 py-[2px] text-[10px] font-medium text-gray-500">
                  {tag.name}
                </span>
              ))}
              {rex.tags.length > 2 && (
                <span className="text-[10px] text-gray-400">+{rex.tags.length - 2}</span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                {(rex.author.full_name || rex.author.username).charAt(0).toUpperCase()}
              </span>
              <span className="text-[12px] text-gray-600 truncate">
                {rex.author.full_name || rex.author.username}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              {rex.view_count > 0 && (
                <span className="flex items-center gap-0.5">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  {rex.view_count}
                </span>
              )}
              {rex.comment_count > 0 && (
                <span className="flex items-center gap-0.5">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg>
                  {rex.comment_count}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>

      {showModal && (
        <RexModal
          rex={{...rex, vote_score: score, user_vote: userVote}}
          onClose={() => setShowModal(false)}
          onDeleted={onBookmarkChange}
        />
      )}
    </>
  );
}
