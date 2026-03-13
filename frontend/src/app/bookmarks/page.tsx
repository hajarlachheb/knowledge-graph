"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBookmarks, RexOut } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import RexCard from "@/components/LearningCard";

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [sheets, setSheets] = useState<RexOut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try { setSheets(await getBookmarks()); } catch { /* silent */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.push("/login"); return; }
    if (user) fetchData();
  }, [user, authLoading, router, fetchData]);

  if (authLoading || loading) return <div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" /></div>;

  return (
    <div className="max-w-[1100px]">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Saved</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your bookmarked REX sheets</p>
      </div>
      {sheets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-gray-400 text-sm">No bookmarks yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{sheets.map((r) => <RexCard key={r.id} rex={r} onBookmarkChange={fetchData} />)}</div>
      )}
    </div>
  );
}
