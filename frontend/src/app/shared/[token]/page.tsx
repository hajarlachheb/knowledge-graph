"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getSharedRex, RexOut } from "@/lib/api";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchSharedRexInitial(token: string): Promise<{ rex: RexOut } | { needsPassword: true }> {
  const res = await fetch(`${BASE}/api/shared/${token}`);
  if (res.status === 401) return { needsPassword: true };
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  const rex = await res.json();
  return { rex };
}

export default function SharedRexPage() {
  const params = useParams();
  const token = params.token as string;
  const [rex, setRex] = useState<RexOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    fetchSharedRexInitial(token)
      .then((result) => {
        if ("needsPassword" in result) {
          setNeedsPassword(true);
        } else {
          setRex(result.rex);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await getSharedRex(token, password);
      setRex(result);
      setNeedsPassword(false);
    } catch {
      setError("Invalid password");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !needsPassword) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (needsPassword && !rex) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Password required</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">This shared REX sheet is protected. Enter the password to view it.</p>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Checking…" : "View REX sheet"}
              </button>
            </form>
          </div>
        </div>
        <footer className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Powered by Knowledgia
        </footer>
      </div>
    );
  }

  if (error && !rex) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <Link href="/" className="text-brand-600 dark:text-brand-400 hover:underline text-sm">Go home</Link>
        <footer className="absolute bottom-4 text-xs text-gray-500 dark:text-gray-400">Powered by Knowledgia</footer>
      </div>
    );
  }

  if (!rex) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex-1 mx-auto w-full max-w-2xl px-4 py-12">
        <article className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 md:p-8 shadow-sm">
          <span className="inline-block rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 mb-4">
            {rex.category || "General"}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{rex.title}</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            by {rex.author.full_name || rex.author.username}
            {rex.author.position && ` · ${rex.author.position}`}
          </p>

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">Problematic</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {rex.problematic}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Solution</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {rex.solution}
            </div>
          </section>
        </article>
      </div>
      <footer className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
        Powered by Knowledgia
      </footer>
    </div>
  );
}
