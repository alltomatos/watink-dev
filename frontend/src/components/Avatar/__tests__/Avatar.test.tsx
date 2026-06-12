import React from "react";
import { expect, describe, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Avatar } from "../index";

describe("Avatar Component", () => {
  it("renders initials correctly when no image is provided", () => {
    render(<Avatar name="Carlos Mendes" />);
    expect(screen.getByText("CM")).toBeInTheDocument();
  });

  it("renders image when src is provided", () => {
    render(<Avatar name="Carlos Mendes" src="https://example.com/avatar.jpg" />);
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(img).toHaveAttribute("alt", "Carlos Mendes");
  });

  it("falls back to initials when image fail to load", () => {
    render(<Avatar name="Carlos Mendes" src="https://example.com/bad-avatar.jpg" />);
    const img = screen.getByRole("img");
    
    // Simulate image load error
    fireEvent.error(img);

    // Image should be gone and initials is rendered
    expect(img).not.toBeInTheDocument();
    expect(screen.getByText("CM")).toBeInTheDocument();
  });

  it("renders online status dot when online prop is true", () => {
    // When online is true, there is a status dot
    const { container } = render(<Avatar name="Carlos Mendes" online={true} />);
    const statusDot = container.querySelector(".wt-avatar-status");
    expect(statusDot).toBeInTheDocument();
    expect(statusDot).toHaveClass("bg-[hsl(var(--status-success))]");
  });

  it("renders offline status dot when online prop is false", () => {
    // When online is false, there is a status dot representing offline
    const { container } = render(<Avatar name="Carlos Mendes" online={false} />);
    const statusDot = container.querySelector(".wt-avatar-status");
    expect(statusDot).toBeInTheDocument();
    expect(statusDot).toHaveClass("bg-[hsl(var(--text-muted))]");
  });
});
