import { describe, it, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import React from "react";

function TestComponent({ text }: { text: string }) {
  return <div data-testid="test">{text}</div>;
}

describe("React Testing Library sanity check", () => {
  it("should render a component", () => {
    render(<TestComponent text="hello" />);
    expect(screen.getByTestId("test").textContent).toBe("hello");
  });
});
