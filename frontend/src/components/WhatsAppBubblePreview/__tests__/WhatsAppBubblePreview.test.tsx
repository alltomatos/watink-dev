import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WhatsAppBubblePreview from "../index";
import type {
  QuickAnswerContentButtons,
  QuickAnswerContentPoll,
} from "@/pages/QuickAnswers/quickAnswersTypes";

describe("WhatsAppBubblePreview", () => {
  it("renderiza placeholder quando type é undefined", () => {
    render(<WhatsAppBubblePreview type={undefined} content={undefined} />);
    expect(
      screen.getByText("Preencha os campos para ver o preview")
    ).toBeInTheDocument();
  });

  it("renderiza texto formatado quando type='text' e message contém *world*", () => {
    render(
      <WhatsAppBubblePreview
        type="text"
        content={{ body: "Hello *world*" }}
        message="Hello *world*"
      />
    );
    const strong = screen.getByText("world");
    expect(strong.tagName).toBe("STRONG");
  });

  it("renderiza variável destacada {{contact_name}} com classe de destaque", () => {
    render(
      <WhatsAppBubblePreview
        type="text"
        content={{ body: "Olá {{contact_name}}" }}
        message="Olá {{contact_name}}"
      />
    );
    const span = screen.getByText("{{contact_name}}");
    expect(span.className).toMatch(/bg-yellow/);
  });

  it("renderiza botões quando type='interactive_buttons' com 2 botões", () => {
    const content: QuickAnswerContentButtons = {
      body: "Escolha uma opção",
      buttons: [
        { id: "btn_1", label: "Sim" },
        { id: "btn_2", label: "Não" },
      ],
    };
    render(<WhatsAppBubblePreview type="interactive_buttons" content={content} />);
    expect(screen.getByText("Sim")).toBeInTheDocument();
    expect(screen.getByText("Não")).toBeInTheDocument();
    expect(screen.getByText("Escolha uma opção")).toBeInTheDocument();
  });

  it("renderiza pergunta e opções quando type='poll'", () => {
    const content: QuickAnswerContentPoll = {
      question: "Qual sua cor favorita?",
      options: ["Azul", "Verde"],
      max_selections: 1,
      capture_results: false,
      on_answer: null,
    };
    render(<WhatsAppBubblePreview type="poll" content={content} />);
    expect(screen.getByText("Qual sua cor favorita?")).toBeInTheDocument();
    expect(screen.getByText("Azul")).toBeInTheDocument();
    expect(screen.getByText("Verde")).toBeInTheDocument();
  });

  it("exibe timestamp fictício '14:32'", () => {
    render(
      <WhatsAppBubblePreview
        type="text"
        content={{ body: "Olá" }}
        message="Olá"
      />
    );
    expect(screen.getByText(/14:32/)).toBeInTheDocument();
  });
});
