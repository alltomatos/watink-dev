import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TicketsList from "../index";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../../../services/sse-client", () => ({
  default: () => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: vi.fn() }),
}));

vi.mock("../../../translate/i18n", () => ({
  i18n: { t: (key: string) => key },
}));

vi.mock("../../../context/Auth/AuthContext", () => ({
  AuthContext: React.createContext({ user: { id: 1 } }),
}));

const mockFetchNextPage = vi.fn();
let mockUseTicketsInfinite = {
  data: undefined as { pages: { tickets: { id: number; userId?: number; queueId?: number }[] }[] } | undefined,
  fetchNextPage: mockFetchNextPage,
  hasNextPage: false,
  isFetchingNextPage: false,
  isLoading: false,
};

vi.mock("../../../hooks/useTicketsInfinite", () => ({
  useTicketsInfinite: () => mockUseTicketsInfinite,
}));

vi.mock("../../TicketListItem", () => ({
  default: ({ ticket }: { ticket: { id: number } }) => (
    <div data-testid={`ticket-${ticket.id}`}>Ticket {ticket.id}</div>
  ),
}));

vi.mock("../../TicketsListSkeleton", () => ({
  default: () => <div data-testid="skeleton" />,
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeTickets(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1 }));
}

function renderList(props: React.ComponentProps<typeof TicketsList> = {}) {
  return render(<TicketsList {...props} />);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("TicketsList", () => {
  beforeEach(() => {
    mockUseTicketsInfinite = {
      data: undefined,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
    };
  });

  it("exibe skeleton enquanto isLoading=true", () => {
    mockUseTicketsInfinite.isLoading = true;
    renderList();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("exibe estado vazio quando sem tickets e sem loading", () => {
    mockUseTicketsInfinite.data = { pages: [{ tickets: [] }] };
    renderList();
    expect(screen.getByText("ticketsList.noTicketsTitle")).toBeInTheDocument();
  });

  it("renderiza um TicketListItem por ticket", () => {
    mockUseTicketsInfinite.data = {
      pages: [{ tickets: makeTickets(3) }],
    };
    renderList();
    expect(screen.getByTestId("ticket-1")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-2")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-3")).toBeInTheDocument();
  });

  it("exibe skeleton de paginacao quando isFetchingNextPage=true", () => {
    mockUseTicketsInfinite.data = { pages: [{ tickets: makeTickets(1) }] };
    mockUseTicketsInfinite.isFetchingNextPage = true;
    renderList();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("chama updateCount com o total de tickets ao montar", () => {
    const updateCount = vi.fn();
    mockUseTicketsInfinite.data = {
      pages: [{ tickets: makeTickets(5) }],
    };
    renderList({ updateCount });
    expect(updateCount).toHaveBeenCalledWith(5);
  });

  it("chama fetchNextPage ao rolar para o fundo com hasNextPage=true", () => {
    mockUseTicketsInfinite.data = { pages: [{ tickets: makeTickets(2) }] };
    mockUseTicketsInfinite.hasNextPage = true;
    renderList();

    const scrollable = screen.getByTestId("ticket-1").closest(".flex-1") as HTMLElement;
    if (!scrollable) return;

    Object.defineProperty(scrollable, "scrollHeight", { value: 1000, configurable: true });
    Object.defineProperty(scrollable, "clientHeight", { value: 400, configurable: true });
    fireEvent.scroll(scrollable, { target: { scrollTop: 700 } });

    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it("nao chama fetchNextPage quando hasNextPage=false", () => {
    mockUseTicketsInfinite.data = { pages: [{ tickets: makeTickets(2) }] };
    mockUseTicketsInfinite.hasNextPage = false;
    mockFetchNextPage.mockClear();
    renderList();

    const scrollable = screen.getByTestId("ticket-1").closest(".flex-1") as HTMLElement;
    if (scrollable) {
      Object.defineProperty(scrollable, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(scrollable, "clientHeight", { value: 400, configurable: true });
      fireEvent.scroll(scrollable, { target: { scrollTop: 700 } });
    }

    expect(mockFetchNextPage).not.toHaveBeenCalled();
  });
});
