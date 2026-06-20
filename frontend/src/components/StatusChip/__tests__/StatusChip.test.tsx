import React from "react";
import { expect, describe, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusChip } from "../index";

describe("StatusChip Component", () => {
  it("renders the correct label text", () => {
    render(<StatusChip status="success" label="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders a dot indicator by default", () => {
    const { container } = render(<StatusChip status="success" label="Active" />);
    const dot = container.querySelector(".wt-chip-dot");
    expect(dot).toBeInTheDocument();
  });

  it("hides the dot indicator when dot prop is false", () => {
    const { container } = render(<StatusChip status="success" label="Active" dot={false} />);
    const dot = container.querySelector(".wt-chip-dot");
    expect(dot).not.toBeInTheDocument();
  });

  it("applies correct status class mapping based on status prop", () => {
    const { container, rerender } = render(<StatusChip status="success" label="Active" />);
    let chip = container.firstChild;
    expect(chip).toHaveClass("bg-[hsl(var(--status-success-bg))]");

    rerender(<StatusChip status="error" label="Failed" />);
    chip = container.firstChild;
    expect(chip).toHaveClass("bg-[hsl(var(--status-error-bg))]");
  });
});
