"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getCollection, removeFromCollection, addToCollection, getRexSheets, CollectionDetail, RexOut } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RexOut[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const id = Number(params.id);

  useEffect(() => {
    if (!showAddDialog) return;
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { items } = await getRexSheets({ q: searchQuery.trim() || undefined, page_size: 10 });
        setSearchResults(items);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [showAddDialog, searchQuery]);

  const fetchCollection = async () => {
    setLoading(true);
    try {
      const data = await getCollection(id);
      setCollection(data);
    } catch {
      setCollection(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && !isNaN(id)) fetchCollection();
  }, [id]);

  const handleAdd = async (rexId: number) => {
    setAddingId(rexId);
    try {
      await addToCollection(id, rexId);
      await fetchCollection();
    } catch {
      setAddingId(null);
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (itemId: number) => {
    if (!confirm("Remove this item from the collection?")) return;
    setRemovingId(itemId);
    try {
      await removeFromCollection(id, itemId);
      await fetchCollection();
    } catch {
      setRemovingId(null);
    } finally {
      setRemovingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent dark:border-brand-500" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Collection not found</p>
        <Link
          href="/collections"
          className="mt-2 inline-block text-brand-600 dark:text-brand-400 hover:underline"
        >
          Back to collections
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Link
            href="/collections"
            className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to collections
          </Link>
          {user?.id === collection.creator_id && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowAddDialog(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add REX
            </button>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {collection.title}
        </h1>
        {collection.description && (
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            {collection.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span>by {collection.creator_name}</span>
          <span>·</span>
          <span>{new Date(collection.created_at).toLocaleDateString()}</span>
          {collection.is_public && (
            <>
              <span>·</span>
              <span className="rounded-full bg-green-100 dark:bg-green-900/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                Public
              </span>
            </>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <h2 className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
          Items ({collection.items.length})
        </h2>
        {collection.items.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No items in this collection yet
            </p>
            <Link
              href="/feed"
              className="mt-2 inline-block text-sm text-brand-600 dark:text-brand-400 hover:underline"
            >
              Browse REX sheets to add
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {collection.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <Link
                  href={`/learnings/${item.rex_id}`}
                  className="flex-1 min-w-0 group"
                >
                  <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                    {item.rex_title}
                  </p>
                  {item.note && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {item.note}
                    </p>
                  )}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/learnings/${item.rex_id}`}
                    className="rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    View REX
                  </Link>
                  {user?.id === collection.creator_id && (
                    <button
                      onClick={() => handleRemove(item.id)}
                      disabled={removingId === item.id}
                      className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                    >
                      {removingId === item.id ? "Removing…" : "Remove"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add REX Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60">
          <div
            className="absolute inset-0"
            onClick={() => setShowAddDialog(false)}
          />
          <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Add REX to collection
            </h2>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search REX sheets..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 outline-none mb-4"
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto">
              {searchLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent dark:border-brand-500" />
                </div>
              ) : searchResults.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery.trim() ? "No REX sheets found" : "Type to search REX sheets"}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {searchResults.map((rex) => {
                    const alreadyAdded = collection?.items.some((item) => item.rex_id === rex.id);
                    return (
                      <li
                        key={rex.id}
                        className="flex items-center justify-between gap-4 py-3 text-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {rex.title}
                          </p>
                          {rex.author && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {rex.author.full_name}
                            </p>
                          )}
                        </div>
                        {alreadyAdded ? (
                          <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                            Already added
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAdd(rex.id)}
                            disabled={addingId === rex.id}
                            className="shrink-0 rounded-lg border border-brand-200 dark:border-brand-700 px-3 py-1.5 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 disabled:opacity-50 transition-colors"
                          >
                            {addingId === rex.id ? "Adding…" : "Add"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
