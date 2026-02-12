"use client";

import { useRef, useEffect, useCallback } from "react";

export function useAutoScroll<T extends HTMLElement>(deps: any[]) {
  const ref = useRef<T>(null);
  const userScrolled = useRef(false);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    // User has scrolled up if not near bottom
    userScrolled.current = scrollHeight - scrollTop - clientHeight > 50;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || userScrolled.current) return;
    el.scrollTop = el.scrollHeight;
  }, deps);

  return { ref, handleScroll };
}
