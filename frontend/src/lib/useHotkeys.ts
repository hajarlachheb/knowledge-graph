"use client";

import { useEffect, useRef, useCallback } from "react";

type KeyHandler = (e: KeyboardEvent) => void;

interface HotkeyDef {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  handler: KeyHandler;
}

export function useHotkeys(hotkeys: HotkeyDef[]) {
  const ref = useRef(hotkeys);
  ref.current = hotkeys;

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

    for (const def of ref.current) {
      const ctrlMatch = def.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const metaMatch = def.meta ? e.metaKey : true;
      if (e.key.toLowerCase() === def.key.toLowerCase() && ctrlMatch && metaMatch) {
        e.preventDefault();
        def.handler(e);
        return;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);
}
