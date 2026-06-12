import React from "react";
import { expect, describe, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BaseCard } from "../index";

describe("BaseCard Component", () => {
  it("renders correctly with title, subtitle and children content", () => {
    render(
      <BaseCard title="My Title" subtitle="My Subtitle">
        <div>Sub-content</div>
      </BaseCard>
    );

    expect(screen.getByText("My Title")).toBeInTheDocument();
    expect(screen.getByText("My Subtitle")).toBeInTheDocument();
    expect(screen.getByText("Sub-content")).toBeInTheDocument();
  });

  it("triggers onClick callback when clicked", () => {
    const handleClick = vi.fn();
    render(
      <BaseCard title="Card Title" onClick={handleClick}>
        <div>Click Me</div>
      </BaseCard>
    );

    const card = screen.getByText("Click Me").closest(".wt-metric, .relative");
    expect(card).toBeInTheDocument();
    
    if (card) {
      fireEvent.click(card);
    }
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
