import { expect, describe, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTickets } from "../useTickets";

const mockGet = vi.fn();
const mockPut = vi.fn();

vi.mock("../../../../services/api", () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
  },
}));

describe("useTickets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sem ticketId: detailTicket é null e não faz requisições", () => {
    const { result } = renderHook(() => useTickets(undefined));
    expect(result.current.detailTicket).toBeNull();
    expect(result.current.hasOpenTicket).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("com ticketId: carrega ticket e seta detailTicket", async () => {
    const ticket = { id: 42, unreadMessages: 0, status: "open" };
    mockGet.mockResolvedValue({ data: ticket });

    const { result } = renderHook(() => useTickets("42"));
    expect(result.current.hasOpenTicket).toBe(true);

    await act(async () => {
      vi.runAllTimers();
    });

    expect(mockGet).toHaveBeenCalledWith("/tickets/42");
    expect(result.current.detailTicket).toEqual(ticket);
  });

  it("ticket com unreadMessages > 0: dispara PUT para zerar", async () => {
    const ticket = { id: 5, unreadMessages: 3, status: "open" };
    mockGet.mockResolvedValue({ data: ticket });
    mockPut.mockResolvedValue({});

    renderHook(() => useTickets("5"));

    await act(async () => {
      vi.runAllTimers();
    });

    expect(mockPut).toHaveBeenCalledWith("/tickets/5", { unreadMessages: 0 });
  });

  it("ticket com unreadMessages === 0: NÃO dispara PUT", async () => {
    const ticket = { id: 7, unreadMessages: 0, status: "open" };
    mockGet.mockResolvedValue({ data: ticket });

    renderHook(() => useTickets("7"));

    await act(async () => {
      vi.runAllTimers();
    });

    expect(mockGet).toHaveBeenCalled();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it("erro no GET: detailTicket fica null e loading false", async () => {
    mockGet.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useTickets("99"));

    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.detailTicket).toBeNull();
    expect(result.current.detailLoading).toBe(false);
  });

  it("showDetails inicia como true e pode ser alterado", () => {
    const { result } = renderHook(() => useTickets(undefined));
    expect(result.current.showDetails).toBe(true);
    act(() => {
      result.current.setShowDetails(false);
    });
    expect(result.current.showDetails).toBe(false);
  });
});
