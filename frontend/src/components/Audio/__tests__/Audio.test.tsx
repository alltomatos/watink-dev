import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Audio from "../index";

// ── Helpers ────────────────────────────────────────────────────────────────────

// HTMLMediaElement não tem implementação real no jsdom — stub mínimo.
function stubAudio() {
  const playMock = vi.fn().mockResolvedValue(undefined);
  const pauseMock = vi.fn();
  Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
    configurable: true,
    writable: true,
    value: playMock,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, "pause", {
    configurable: true,
    writable: true,
    value: pauseMock,
  });
  return { playMock, pauseMock };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Audio", () => {
  beforeEach(() => {
    localStorage.clear();
    stubAudio();
  });

  it("renderiza botão de play e indicadores de tempo", () => {
    render(<Audio url="/media/test.ogg" />);
    expect(screen.getByRole("button", { name: /reproduzir/i })).toBeInTheDocument();
    // dois spans de tempo: 0:00 / 0:00
    const times = screen.getAllByText("0:00");
    expect(times.length).toBeGreaterThanOrEqual(2);
  });

  it("usa mimetype prop como source type", () => {
    const { container } = render(<Audio url="/media/test.mp3" mimetype="audio/mpeg" />);
    const sources = container.querySelectorAll("source");
    expect(sources[0].getAttribute("type")).toBe("audio/mpeg");
  });

  it("fallback para audio/ogg quando mimetype nao passado", () => {
    const { container } = render(<Audio url="/media/test.ogg" />);
    const sources = container.querySelectorAll("source");
    expect(sources[0].getAttribute("type")).toBe("audio/ogg");
  });

  it("exibe botao de velocidade com valor inicial 1x", () => {
    render(<Audio url="/media/test.ogg" />);
    expect(screen.getByRole("button", { name: /velocidade 1x/i })).toBeInTheDocument();
  });

  it("cicla velocidade ao clicar no botao: 1x→1.5x→2x→0.5x→1x", () => {
    render(<Audio url="/media/test.ogg" />);
    const btn = screen.getByRole("button", { name: /velocidade/i });
    expect(btn.textContent).toBe("1x");
    fireEvent.click(btn);
    expect(btn.textContent).toBe("1.5x");
    fireEvent.click(btn);
    expect(btn.textContent).toBe("2x");
    fireEvent.click(btn);
    expect(btn.textContent).toBe("0.5x");
    fireEvent.click(btn);
    expect(btn.textContent).toBe("1x");
  });

  it("persiste velocidade no localStorage ao ciclar", () => {
    render(<Audio url="/media/test.ogg" />);
    const btn = screen.getByRole("button", { name: /velocidade/i });
    fireEvent.click(btn); // 1.5x
    expect(localStorage.getItem("audioMessageRate")).toBe("1.5");
  });

  it("restaura velocidade salva no localStorage ao montar", () => {
    localStorage.setItem("audioMessageRate", "2");
    render(<Audio url="/media/test.ogg" />);
    const btn = screen.getByRole("button", { name: /velocidade/i });
    expect(btn.textContent).toBe("2x");
  });

  it("chama play ao clicar no botao de play", async () => {
    const { playMock } = stubAudio();
    render(<Audio url="/media/test.ogg" />);
    const playBtn = screen.getByRole("button", { name: /reproduzir/i });
    fireEvent.click(playBtn);
    expect(playMock).toHaveBeenCalled();
  });
});

// ── formatTime (função pura — testada via comportamento DOM) ──────────────────

describe("formatTime helper via Audio", () => {
  it("exibe 0:00 quando duracao e zero", () => {
    render(<Audio url="/x.ogg" />);
    const zeros = screen.getAllByText("0:00");
    expect(zeros.length).toBeGreaterThanOrEqual(1);
  });
});
