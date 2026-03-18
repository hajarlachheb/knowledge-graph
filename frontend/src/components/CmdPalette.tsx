"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useHotkeys } from "@/lib/useHotkeys";

const COMMANDS = [
  { label: "Go to Dashboard", shortcut: "G D", href: "/dashboard" },
  { label: "Go to REX Sheets", shortcut: "G F", href: "/feed" },
  { label: "Go to Knowledge Graph", shortcut: "G G", href: "/graph" },
  { label: "Ask Knowledgia AI", shortcut: "G S", href: "/search" },
  { label: "People", shortcut: "G P", href: "/people" },
  { label: "Bookmarks", shortcut: "G B", href: "/bookmarks" },
  { label: "Collections", shortcut: "G C", href: "/collections" },
  { label: "New REX Sheet", shortcut: "N", href: "/learnings/new" },
  { label: "Admin Panel", shortcut: "G A", href: "/admin" },
];

export default function CmdPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useHotkeys([
    { key: "k", ctrl: true, handler: () => setOpen(true) },
    { key: "Escape", handler: () => setOpen(false) },
  ]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const filtered = COMMANDS.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center border-b border-gray-100 dark:border-gray-700 px-4 py-3">
          <svg className="h-5 w-5 text-gray-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 outline-none placeholder:text-gray-400"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              if (e.key === "Enter" && filtered.length > 0) go(filtered[0].href);
            }}
          />
          <kbd className="ml-2 rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">ESC</kbd>
        </div>
        <ul className="max-h-64 overflow-y-auto py-2">
          {filtered.map((cmd) => (
            <li key={cmd.href}>
              <button
                onClick={() => go(cmd.href)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span>{cmd.label}</span>
                <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-500 dark:text-gray-400">{cmd.shortcut}</kbd>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-sm text-gray-400 text-center">No commands found</li>
          )}
        </ul>
      </div>
    </div>
  );
}
