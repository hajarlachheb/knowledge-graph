"use client";

import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { addBookmark, removeBookmark, RexOut } from "@/lib/api";

interface Props {
  rex: RexOut;
  onToggle?: () => void;
}

export default function BookmarkButton({ rex, onToggle }: Props) {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(rex.is_bookmarked);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (bookmarked) {
        await removeBookmark(rex.id);
        setBookmarked(false);
      } else {
        await addBookmark(rex.id);
        setBookmarked(true);
      }
      onToggle?.();
    } catch {
      // silent
    } finally {
      setBusy(false);
    }
  };

  return (
    <button onClick={toggle} disabled={busy} className="flex-shrink-0 text-gray-400 hover:text-brand-600 transition-colors disabled:opacity-50" title={bookmarked ? "Remove bookmark" : "Bookmark"}>
      <svg className="h-5 w-5" fill={bookmarked ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
      </svg>
    </button>
  );
}
