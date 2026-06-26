import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickAnswersList from "../QuickAnswersList";
import type { QuickAnswer } from "../../../../pages/QuickAnswers/quickAnswersTypes";

describe("QuickAnswersList", () => {
  it("renderiza null quando answers está vazio", () => {
    const { container } = render(
      <QuickAnswersList answers={[]} onSelect={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderiza ícone de tipo para type='poll' (BarChart2)", () => {
    const answer: QuickAnswer = {
      id: 1,
      shortcut: "enquete",
      message: "Votação",
      type: "poll",
      content: {
        question: "Qual opção?",
        options: ["A", "B"],
        max_selections: 1,
        capture_results: false,
        on_answer: null,
      },
    };
    render(<QuickAnswersList answers={[answer]} onSelect={vi.fn()} />);
    // BarChart2 is rendered as an SVG icon inside the list item
    const listItem = screen.getByRole("listitem");
    expect(listItem.querySelector("svg")).not.toBeNull();
    expect(screen.getByText(/enquete/)).toBeInTheDocument();
  });

  it("renderiza preview do body para type='interactive_buttons' com content {body: 'Escolha'}", () => {
    const answer: QuickAnswer = {
      id: 2,
      shortcut: "opcoes",
      message: "Escolha",
      type: "interactive_buttons",
      content: {
        body: "Escolha",
        buttons: [{ id: "btn_1", label: "Sim" }],
      },
    };
    render(<QuickAnswersList answers={[answer]} onSelect={vi.fn()} />);
    expect(screen.getByText(/Escolha/)).toBeInTheDocument();
  });

  it("renderiza shortcut corretamente: /saudacao", () => {
    const answer: QuickAnswer = {
      id: 3,
      shortcut: "saudacao",
      message: "Olá! Como posso ajudar?",
    };
    render(<QuickAnswersList answers={[answer]} onSelect={vi.fn()} />);
    expect(screen.getByText(/\/saudacao/)).toBeInTheDocument();
  });

  it("ao clicar em um item, chama onSelect com o objeto QuickAnswer completo", () => {
    const onSelect = vi.fn();
    const answer: QuickAnswer = {
      id: 4,
      shortcut: "teste",
      message: "Mensagem de teste",
      type: "text",
      content: { body: "Mensagem de teste" },
    };
    render(<QuickAnswersList answers={[answer]} onSelect={onSelect} />);
    const link = screen.getByRole("link");
    fireEvent.click(link);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(answer);
  });
});
