"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/** Shape of a single usage bucket */
export interface UsageBucket {
  utilization: number;
  resets_at: string | null;
}

/** Response from /api/usage */
export interface UsageData {
  five_hour: UsageBucket | null;
  seven_day: UsageBucket | null;
  seven_day_sonnet: UsageBucket | null;
  error?: string;
}

const POLL_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Hook to poll Claude Code usage data from /api/usage.
 *
 * - Fetches immediately on mount
 * - Polls every 60 seconds
 * - Gracefully handles errors (returns null values)
 */
export function useUsage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      const json: UsageData = await res.json();
      setData(json);
    } catch (err) {
      console.error("[useUsage] Failed to fetch usage:", err);
      setData({
        five_hour: null,
        seven_day: null,
        seven_day_sonnet: null,
        error: "Network error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch immediately
    fetchUsage();

    // Then poll every 60s
    intervalRef.current = setInterval(fetchUsage, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchUsage]);

  return { data, loading };
}
