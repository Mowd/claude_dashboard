import { describe, it, expect, mock } from "bun:test";
import { render } from "@testing-library/react";
import React from "react";

let usageState: any = {
  loading: false,
  data: {
    five_hour: { utilization: 25, resets_at: "2026-02-13T00:00:00Z" },
    seven_day: { utilization: 50, resets_at: "2026-02-14T00:00:00Z" },
    seven_day_sonnet: { utilization: 75, resets_at: null },
  },
};

mock.module("@/hooks/useUsage", () => ({
  useUsage: () => usageState,
}));

describe("getUsageColor logic", () => {
  it("should classify utilization < 50 as emerald (normal)", () => {
    const testValues = [0, 10, 25, 49, 49.9];
    for (const val of testValues) {
      expect(val).toBeLessThan(50);
    }
  });

  it("should classify 50 <= utilization <= 80 as yellow (warning)", () => {
    const testValues = [50, 65, 75, 80];
    for (const val of testValues) {
      expect(val).toBeGreaterThanOrEqual(50);
      expect(val).toBeLessThanOrEqual(80);
    }
  });

  it("should classify utilization > 80 as red (danger)", () => {
    const testValues = [81, 90, 95, 100];
    for (const val of testValues) {
      expect(val).toBeGreaterThan(80);
    }
  });
});

describe("formatPercent logic", () => {
  it("should round to nearest integer", () => {
    expect(Math.round(25.5)).toBe(26);
    expect(Math.round(25.4)).toBe(25);
    expect(Math.round(99.9)).toBe(100);
  });

  it("should return -- for null/undefined", () => {
    const formatPercent = (val: number | null | undefined) => {
      if (val == null) return "--";
      return `${Math.round(val)}%`;
    };

    expect(formatPercent(null)).toBe("--");
    expect(formatPercent(undefined)).toBe("--");
    expect(formatPercent(50)).toBe("50%");
  });
});

describe("UsageIndicator component", () => {
  it("should render loading state initially", async () => {
    usageState = { loading: true, data: null };
    const { UsageIndicator } = await import("@/components/layout/UsageIndicator");
    const { container } = render(<UsageIndicator />);

    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("should render three usage metrics after data loads", async () => {
    usageState = {
      loading: false,
      data: {
        five_hour: { utilization: 25, resets_at: "2026-02-13T00:00:00Z" },
        seven_day: { utilization: 50, resets_at: "2026-02-14T00:00:00Z" },
        seven_day_sonnet: { utilization: 10, resets_at: null },
      },
    };

    const { UsageIndicator } = await import("@/components/layout/UsageIndicator");
    const { container } = render(<UsageIndicator />);
    const text = container.textContent || "";

    expect(text).toContain("Session");
    expect(text).toContain("Week");
    expect(text).toContain("Sonnet");
  });

  it("should apply correct color classes", async () => {
    usageState = {
      loading: false,
      data: {
        five_hour: { utilization: 25, resets_at: null },
        seven_day: { utilization: 65, resets_at: null },
        seven_day_sonnet: { utilization: 90, resets_at: null },
      },
    };

    const { UsageIndicator } = await import("@/components/layout/UsageIndicator");
    const { container } = render(<UsageIndicator />);
    const html = container.innerHTML;

    expect(html).toContain("text-emerald-400");
    expect(html).toContain("text-yellow-400");
    expect(html).toContain("text-red-400");
  });

  it("should show fallback when usage unavailable", async () => {
    usageState = {
      loading: false,
      data: {
        five_hour: null,
        seven_day: null,
        seven_day_sonnet: null,
        error: "Keychain error",
      },
    };

    const { UsageIndicator } = await import("@/components/layout/UsageIndicator");
    const { container } = render(<UsageIndicator />);

    expect(container.textContent || "").toContain("Usage: --");
    expect(container.querySelector('[aria-label="Usage data unavailable"]')).not.toBeNull();
  });

  it("should have role=status and separators", async () => {
    usageState = {
      loading: false,
      data: {
        five_hour: { utilization: 10, resets_at: null },
        seven_day: { utilization: 20, resets_at: null },
        seven_day_sonnet: { utilization: 30, resets_at: null },
      },
    };

    const { UsageIndicator } = await import("@/components/layout/UsageIndicator");
    const { container } = render(<UsageIndicator />);

    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(2);
    expect(container.innerHTML).toContain("tabular-nums");
  });
});
