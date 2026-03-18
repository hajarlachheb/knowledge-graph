"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCollections, createCollection, CollectionOut } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

function truncate(str: string, len: number) {
  if (!str) return "";
  return str.length <= len ? str : str.slice(0, len) + "…";
}

export default function CollectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [collections, setCollections] = useState<CollectionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPublic, setFormPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const data = await getCollections();
      setCollections(data);
    } catch {
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCollections();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formTitle.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      await createCollection({
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        is_public: formPublic,
      });
      setFormTitle("");
      setFormDescription("");
      setFormPublic(false);
      setShowDialog(false);
      await fetchCollections();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create collection");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (loading && collections.length === 0)) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent dark:border-brand-500" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Collections
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Curated learning paths and knowledge collections
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowDialog(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Collection
          </button>
        )}
      </div>

      {/* New Collection Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/60">
          <div
            className="absolute inset-0"
            onClick={() => !submitting && setShowDialog(false)}
          />
          <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              New Collection
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Onboarding Essentials"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="public"
                  checked={formPublic}
                  onChange={(e) => setFormPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="public" className="text-sm text-gray-700 dark:text-gray-300">
                  Public (visible to others)
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !submitting && setShowDialog(false)}
                  className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                  {submitting ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {collections.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-16 text-center bg-white dark:bg-gray-800/50">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No collections yet
          </p>
          {user && (
            <button
              onClick={() => setShowDialog(true)}
              className="mt-2 inline-block text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
              Create your first collection
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.id}`}
              className="group rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2">
                {c.title}
              </h3>
              {c.description && (
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                  {truncate(c.description, 100)}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>{c.item_count} item{c.item_count !== 1 ? "s" : ""}</span>
                <span>{c.creator_name}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                {new Date(c.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
