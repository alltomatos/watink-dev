import React from "react";
import { expect, describe, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TicketsManager from "../index";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../../context/Tickets/TicketsContext", () => ({
  useTicketsContext: () => ({}),
}));

vi.mock("../../../context/Auth/AuthContext", () => ({
  AuthContext: React.createContext({ user: { queues: [] } }),
}));

vi.mock("../../TicketsList", () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="tickets-list" data-is-group={String(props.isGroup)} />
  ),
}));

vi.mock("../../NewTicketModal/NewTicketModal", () => ({
  NewTicketModal: () => <div />,
}));

vi.mock("../../TicketsQueueSelect", () => ({
  default: () => <div />,
}));

vi.mock("../../TicketsTagFilter", () => ({
  default: () => <div />,
}));

vi.mock("../../Can", () => ({
  Can: ({ yes }: { yes: () => React.ReactNode }) => <>{yes()}</>,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TicketsManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza as 4 pills de status", () => {
    render(<TicketsManager />);
    expect(screen.getByText("Todos")).toBeTruthy();
    expect(screen.getByText("Abertos")).toBeTruthy();
    expect(screen.getByText("Aguardando")).toBeTruthy();
    expect(screen.getByText("Fechados")).toBeTruthy();
  });

  it("renderiza os chips Grupos e Não lidas", () => {
    render(<TicketsManager />);
    expect(screen.getByText("Grupos")).toBeTruthy();
    expect(screen.getByText("Não lidas")).toBeTruthy();
  });

  it("chip Grupos começa inativo", () => {
    render(<TicketsManager />);
    const chip = screen.getByText("Grupos").closest("button")!;
    expect(chip.className).not.toContain("border-primary");
  });

  it("clicar em Grupos ativa o chip", () => {
    render(<TicketsManager />);
    const chip = screen.getByText("Grupos").closest("button")!;
    fireEvent.click(chip);
    expect(chip.className).toContain("border-primary");
  });

  it("clicar em Grupos duas vezes desativa o chip (toggle)", () => {
    render(<TicketsManager />);
    const chip = screen.getByText("Grupos").closest("button")!;
    fireEvent.click(chip);
    fireEvent.click(chip);
    expect(chip.className).not.toContain("border-primary");
  });

  it("clicar em Não lidas ativa o chip", () => {
    render(<TicketsManager />);
    const chip = screen.getByText("Não lidas").closest("button")!;
    fireEvent.click(chip);
    expect(chip.className).toContain("border-primary");
  });

  it("TicketsList recebe isGroup='false' por padrão", () => {
    render(<TicketsManager />);
    const list = screen.getByTestId("tickets-list");
    expect(list.getAttribute("data-is-group")).toBe("false");
  });
});
