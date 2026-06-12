import React from "react";
import { expect, describe, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCard } from "../index";

describe("MetricCard Component", () => {
  it("renders correctly with label and value", () => {
    render(<MetricCard label="Total Tickets" value={452} />);
    expect(screen.getByText("Total Tickets")).toBeInTheDocument();
    expect(screen.getByText("452")).toBeInTheDocument();
  });

  it("renders positive trend with TrendingUp icon", () => {
    const { container } = render(
      <MetricCard
        label="Total Tickets"
        value={452}
        trend={{ value: "+12.4%", positive: true }}
      />
    );
    expect(screen.getByText("+12.4%")).toBeInTheDocument();
    
    // Check for TrendingUp representation
    const trendingUpIcon = container.querySelector(".lucide-trending-up");
    expect(trendingUpIcon).toBeInTheDocument();
  });

  it("renders negative trend with TrendingDown icon", () => {
    const { container } = render(
      <MetricCard
        label="Total Tickets"
        value={452}
        trend={{ value: "-5.2%", positive: false }}
      />
    );
    expect(screen.getByText("-5.2%")).toBeInTheDocument();

    // Check for TrendingDown representation
    const trendingDownIcon = container.querySelector(".lucide-trending-down");
    expect(trendingDownIcon).toBeInTheDocument();
  });
});
