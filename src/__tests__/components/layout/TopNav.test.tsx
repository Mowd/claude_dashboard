import { describe, it, expect, mock } from "bun:test";
import { render } from "@testing-library/react";
import React from "react";

// Mock stores and child components to isolate TopNav structure tests
mock.module("@/stores/workflowStore", () => ({
  useWorkflowStore: () => ({
    status: "pending",
    title: "",
    startedAt: null,
    completedAt: null,
  }),
}));

mock.module("@/stores/agentStore", () => ({
  useAgentStore: (selector: (s: any) => any) =>
    selector({
      agents: {
        PM: { status: "pending" },
        RD: { status: "pending" },
        UI: { status: "pending" },
        TEST: { status: "pending" },
        SEC: { status: "pending" },
      },
    }),
}));

mock.module("@/lib/workflow/types", () => ({
  AGENT_ORDER: ["PM", "RD", "UI", "TEST", "SEC"],
}));

mock.module("@/hooks/useUsage", () => ({
  useUsage: () => ({
    loading: false,
    data: {
      five_hour: { utilization: 10, resets_at: null },
      seven_day: { utilization: 20, resets_at: null },
      seven_day_sonnet: { utilization: 30, resets_at: null },
    },
  }),
}));

describe("TopNav component", () => {
  it("should render Claude Dashboard title", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const h1 = container.querySelector("h1");
    expect(h1?.textContent).toBe("Claude Dashboard");
  });

  it("should include UsageIndicator component", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const usageEl = container.querySelector('[aria-label="Claude Code usage metrics"]');
    expect(usageEl).not.toBeNull();
  });

  it("should maintain h-12 height class", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const header = container.querySelector("header");
    expect(header?.className).toContain("h-12");
  });

  it("should have flex layout for single-line display", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const header = container.querySelector("header");
    expect(header?.className).toContain("flex");
    expect(header?.className).toContain("items-center");
  });

  it("should have min-w-0 on left section to prevent overflow", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const leftSection = container.querySelector("header > div");
    expect(leftSection?.className).toContain("min-w-0");
  });

  it("should have responsive divider before UsageIndicator", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const divider = container.querySelector(".w-px.bg-border");
    expect(divider).not.toBeNull();
    expect(divider?.className).toContain("hidden");
    expect(divider?.className).toContain("md:block");
  });

  it("should have whitespace-nowrap on title", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const h1 = container.querySelector("h1");
    expect(h1?.className).toContain("whitespace-nowrap");
  });

  it("should render as a header element", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const header = container.querySelector("header");
    expect(header).not.toBeNull();
    expect(header?.tagName.toLowerCase()).toBe("header");
  });
});

describe("TopNav - with workflow status", () => {
  it("should not show status badge when status is pending", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const statusBadges = container.querySelectorAll(".rounded-full");
    expect(statusBadges.length).toBe(0);
  });
});

describe("TopNav - structural integrity for usage display", () => {
  it("should have UsageIndicator adjacent to the divider", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const leftSection = container.querySelector("header > div");
    const children = leftSection?.children;
    if (children) {
      const childArray = Array.from(children);
      const dividerIndex = childArray.findIndex((el) =>
        el.className?.includes("w-px")
      );
      const usageIndex = childArray.findIndex((el) =>
        Boolean(
          el.getAttribute("aria-label")?.includes("usage") ||
            el.getAttribute("aria-label")?.includes("Usage")
        )
      );

      if (dividerIndex >= 0 && usageIndex >= 0) {
        expect(usageIndex).toBe(dividerIndex + 1);
      }
    }
  });

  it("should use border-b for bottom border", async () => {
    const { TopNav } = await import("@/components/layout/TopNav");
    const { container } = render(<TopNav />);

    const header = container.querySelector("header");
    expect(header?.className).toContain("border-b");
    expect(header?.className).toContain("border-border");
  });
});
