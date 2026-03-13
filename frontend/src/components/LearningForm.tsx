"use client";

import { useState, FormEvent, useCallback } from "react";
import { suggestTags } from "@/lib/api";

const CATEGORIES = [
  { value: "lesson-learned", label: "Lesson Learned" },
  { value: "best-practice", label: "Best Practice" },
  { value: "incident", label: "Incident" },
  { value: "process-improvement", label: "Process Improvement" },
  { value: "technical-guide", label: "Technical Guide" },
];

interface Props {
  initialTitle?: string;
  initialProblematic?: string;
  initialSolution?: string;
  initialTags?: string[];
  initialCategory?: string;
  initialStatus?: string;
  submitLabel?: string;
  onSubmit: (data: { title: string; problematic: string; solution: string; tags: string[]; category: string; status: string }) => Promise<void>;
}

export default function LearningForm({
  initialTitle = "", initialProblematic = "", initialSolution = "",
  initialTags = [], initialCategory = "lesson-learned", initialStatus = "published",
  submitLabel = "Publish", onSubmit,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [problematic, setProblematic] = useState(initialProblematic);
  const [solution, setSolution] = useState(initialSolution);
  const [tagInput, setTagInput] = useState(initialTags.join(", "));
  const [category, setCategory] = useState(initialCategory);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSuggest = useCallback(async () => {
    if (!title && !problematic && !solution) return;
    try {
      const res = await suggestTags({ title, problematic, solution });
      setSuggestions(res.tags);
    } catch { /* silent */ }
  }, [title, problematic, solution]);

  const addSuggestion = (tag: string) => {
    const existing = tagInput.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (!existing.includes(tag.toLowerCase())) {
      setTagInput(existing.length > 0 ? `${tagInput}, ${tag}` : tag);
    }
    setSuggestions((prev) => prev.filter((s) => s !== tag));
  };

  const handleSubmit = async (e: FormEvent, status: string = "published") => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const tags = tagInput.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
      await onSubmit({ title, problematic, solution, tags, category, status });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, "published")} className="space-y-5">
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
          placeholder="e.g. How we reduced deploy time by 80%" />
      </div>

      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none">
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="problematic" className="block text-sm font-medium text-gray-700 mb-1">Problematic</label>
        <textarea id="problematic" value={problematic} onChange={(e) => setProblematic(e.target.value)} required rows={5}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none resize-y"
          placeholder="What was the problem? What was the context? What impact did it have?" />
      </div>

      <div>
        <label htmlFor="solution" className="block text-sm font-medium text-gray-700 mb-1">Solution</label>
        <textarea id="solution" value={solution} onChange={(e) => setSolution(e.target.value)} required rows={5}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none resize-y"
          placeholder="How did you solve it? What steps did you take? What was the result?" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
            Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
          </label>
          <button type="button" onClick={handleSuggest}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            Suggest tags
          </button>
        </div>
        <input id="tags" type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none"
          placeholder="python, deployment, performance" />
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => addSuggestion(s)}
                className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs text-purple-700 hover:bg-purple-100 transition-colors">
                + {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={submitting}
          className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors">
          {submitting ? "Saving\u2026" : submitLabel}
        </button>
        <button type="button" disabled={submitting}
          onClick={(e) => handleSubmit(e, "draft")}
          className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
          Save as Draft
        </button>
      </div>
    </form>
  );
}
