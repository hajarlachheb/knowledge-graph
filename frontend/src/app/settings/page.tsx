"use client";

import { useEffect, useState, FormEvent } from "react";
import { getEmailPreferences, updateEmailPreferences, EmailPreferenceOut } from "@/lib/api";

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<EmailPreferenceOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getEmailPreferences()
      .then(setPrefs)
      .catch(() => setPrefs({ weekly_digest: false, new_from_followed: false, saved_search_alerts: false }))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prefs) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateEmailPreferences(prefs);
      setMessage({ type: "success", text: "Preferences saved." });
    } catch {
      setMessage({ type: "error", text: "Failed to save preferences." });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof EmailPreferenceOut, value: boolean) => {
    if (prefs) setPrefs({ ...prefs, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent dark:border-brand-500" />
      </div>
    );
  }

  if (!prefs) {
    return (
      <div className="text-center py-20 text-gray-500 dark:text-gray-400">
        Could not load preferences.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Manage your email preferences.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email preferences</h2>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Weekly digest</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive a weekly summary of new REX sheets.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.weekly_digest}
              onClick={() => toggle("weekly_digest", !prefs.weekly_digest)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                prefs.weekly_digest ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-200 shadow ring-0 transition-transform ${
                  prefs.weekly_digest ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">New from followed users</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Get notified when people you follow post new REX sheets.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.new_from_followed}
              onClick={() => toggle("new_from_followed", !prefs.new_from_followed)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                prefs.new_from_followed ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-200 shadow ring-0 transition-transform ${
                  prefs.new_from_followed ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Saved search alerts</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts when new REX sheets match your saved searches.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.saved_search_alerts}
              onClick={() => toggle("saved_search_alerts", !prefs.saved_search_alerts)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                prefs.saved_search_alerts ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-gray-200 shadow ring-0 transition-transform ${
                  prefs.saved_search_alerts ? "translate-x-5" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </form>
    </div>
  );
}
