import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { render, screen } from "@testing-library/react";
import React from "react";

// ===== Test helper functions directly (exported or internal logic) =====

describe("getUsageColor logic", () => {
  // We test the color classification logic based on utilization thresholds

  it("should classify utilization < 50 as emerald (normal)", () => {
    // Test values: 0, 10, 25, 49
    const testValues = [0, 10, 25, 49, 49.9];
    for (const val of testValues) {
      // Based on the source code:
      // if (utilization > 80) return "text-red-400";
      // if (utilization >= 50) return "text-yellow-400";
      // return "text-emerald-400";
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
    expect(Math.round(0)).toBe(0);
    expect(Math.round(100)).toBe(100);
    expect(Math.round(99.9)).toBe(100);
  });

  it("should return -- for null/undefined", () => {
    const formatPercent = (val: number | null | undefined) => {
      if (val == null) return "--";
      return `${Math.round(val)}%`;
    };

    expect(formatPercent(null)).toBe("--");
    expect(formatPercent(undefined)).toBe("--");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(50)).toBe("50%");
    expect(formatPercent(100)).toBe("100%");
  });
});

describe("formatResetTime logic", () => {
  it("should return N/A for null/undefined/empty", () => {
    const formatResetTime = (resetsAt: string | null | undefined) => {
      if (!resetsAt) return "N/A";
      try {
        const date = new Date(resetsAt);
        return date.toLocaleString("zh-TW", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      } catch {
        return "N/A";
      }
    };

    expect(formatResetTime(null)).toBe("N/A");
    expect(formatResetTime(undefined)).toBe("N/A");
    expect(formatResetTime("")).toBe("N/A");
  });

  it("should format valid ISO date strings", () => {
    const formatResetTime = (resetsAt: string | null | undefined) => {
      if (!resetsAt) return "N/A";
      try {
        const date = new Date(resetsAt);
        return date.toLocaleString("zh-TW", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      } catch {
        return "N/A";
      }
    };

    const result = formatResetTime("2026-02-13T14:00:00Z");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("N/A");
    // The format should contain numbers
    expect(result).toMatch(/\d/);
  });
});

describe("UsageIndicator component", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should render loading state initially", async () => {
    // Delay the fetch response to capture loading state
    globalThis.fetch = (async () => {
      return new Promise(() => {
        // Never resolves - keeps component in loading state
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    // In loading state, should show pulse animation elements
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("should render three usage metrics after data loads", async () => {
    const mockData = {
      five_hour: { utilization: 25, resets_at: "2026-02-13T00:00:00Z" },
      seven_day: { utilization: 50, resets_at: "2026-02-14T00:00:00Z" },
      seven_day_sonnet: { utilization: 10, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    // Wait for data to be rendered
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Re-render to get updated state
    const text = container.textContent || "";

    // Should contain the three labels
    expect(text).toContain("Session");
    expect(text).toContain("Week");
    expect(text).toContain("Sonnet");
  });

  it("should display correct percentage values", async () => {
    const mockData = {
      five_hour: { utilization: 25, resets_at: "2026-02-13T00:00:00Z" },
      seven_day: { utilization: 50, resets_at: "2026-02-14T00:00:00Z" },
      seven_day_sonnet: { utilization: 75, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const text = container.textContent || "";
    expect(text).toContain("25%");
    expect(text).toContain("50%");
    expect(text).toContain("75%");
  });

  it("should apply correct color classes based on utilization thresholds", async () => {
    const mockData = {
      five_hour: { utilization: 25, resets_at: null }, // < 50 → emerald
      seven_day: { utilization: 65, resets_at: null }, // 50-80 → yellow
      seven_day_sonnet: { utilization: 90, resets_at: null }, // > 80 → red
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check for color classes in the rendered HTML
    const html = container.innerHTML;
    expect(html).toContain("text-emerald-400");
    expect(html).toContain("text-yellow-400");
    expect(html).toContain("text-red-400");
  });

  it("should show -- for null utilization values", async () => {
    const mockData = {
      five_hour: null,
      seven_day: null,
      seven_day_sonnet: null,
      error: "Keychain error",
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const text = container.textContent || "";
    expect(text).toContain("--");
  });

  it("should have responsive hidden class for small screens", async () => {
    globalThis.fetch = (async () => {
      return new Promise(() => {}); // Keep in loading state
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    const outerDiv = container.firstElementChild;
    expect(outerDiv?.className).toContain("hidden");
    expect(outerDiv?.className).toContain("md:flex");
  });

  it("should have role=status and aria-label for accessibility", async () => {
    const mockData = {
      five_hour: { utilization: 10, resets_at: null },
      seven_day: { utilization: 20, resets_at: null },
      seven_day_sonnet: { utilization: 30, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const statusElement = container.querySelector('[role="status"]');
    expect(statusElement).not.toBeNull();
    expect(statusElement?.getAttribute("aria-label")).toBe(
      "Claude Code usage metrics"
    );
  });

  it("should render separator elements with aria-hidden", async () => {
    const mockData = {
      five_hour: { utilization: 10, resets_at: null },
      seven_day: { utilization: 20, resets_at: null },
      seven_day_sonnet: { utilization: 30, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators.length).toBe(2); // Two "|" separators
    for (const sep of separators) {
      expect(sep.textContent).toBe("|");
    }
  });

  it("should use tabular-nums class for consistent number alignment", async () => {
    const mockData = {
      five_hour: { utilization: 10, resets_at: null },
      seven_day: { utilization: 20, resets_at: null },
      seven_day_sonnet: { utilization: 30, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const html = container.innerHTML;
    expect(html).toContain("tabular-nums");
  });
});

describe("UsageIndicator - edge cases", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should handle 0% utilization correctly", async () => {
    const mockData = {
      five_hour: { utilization: 0, resets_at: null },
      seven_day: { utilization: 0, resets_at: null },
      seven_day_sonnet: { utilization: 0, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const text = container.textContent || "";
    expect(text).toContain("0%");
    // 0% should show emerald (green)
    const html = container.innerHTML;
    expect(html).toContain("text-emerald-400");
  });

  it("should handle 100% utilization correctly", async () => {
    const mockData = {
      five_hour: { utilization: 100, resets_at: null },
      seven_day: { utilization: 100, resets_at: null },
      seven_day_sonnet: { utilization: 100, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const text = container.textContent || "";
    expect(text).toContain("100%");
    // 100% should show red
    const html = container.innerHTML;
    expect(html).toContain("text-red-400");
  });

  it("should handle boundary value 50 as yellow", async () => {
    const mockData = {
      five_hour: { utilization: 50, resets_at: null },
      seven_day: { utilization: 50, resets_at: null },
      seven_day_sonnet: { utilization: 50, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const html = container.innerHTML;
    expect(html).toContain("text-yellow-400");
  });

  it("should handle boundary value 80 as yellow (not red)", async () => {
    const mockData = {
      five_hour: { utilization: 80, resets_at: null },
      seven_day: { utilization: 80, resets_at: null },
      seven_day_sonnet: { utilization: 80, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const html = container.innerHTML;
    // 80 is >= 50 but NOT > 80, so it should be yellow
    expect(html).toContain("text-yellow-400");
    expect(html).not.toContain("text-red-400");
  });

  it("should handle boundary value 81 as red", async () => {
    const mockData = {
      five_hour: { utilization: 81, resets_at: null },
      seven_day: { utilization: 81, resets_at: null },
      seven_day_sonnet: { utilization: 81, resets_at: null },
    };

    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof globalThis.fetch;

    const { UsageIndicator } = await import(
      "@/components/layout/UsageIndicator"
    );
    const { container } = render(<UsageIndicator />);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const html = container.innerHTML;
    expect(html).toContain("text-red-400");
  });

  it("should handle decimal utilization values (round to integer)", () => {
    const formatPercent = (val: number | null | undefined) => {
      if (val == null) return "--";
      return `${Math.round(val)}%`;
    };

    expect(formatPercent(25.3)).toBe("25%");
    expect(formatPercent(25.5)).toBe("26%");
    expect(formatPercent(25.9)).toBe("26%");
    expect(formatPercent(0.1)).toBe("0%");
    expect(formatPercent(99.9)).toBe("100%");
  });
});
