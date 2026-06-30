import type {
  QuickAnswerType,
  QuickAnswerContentButtons,
  QuickAnswerContentList,
  QuickAnswerContentMedia,
  QuickAnswerContentPoll,
  QuickAnswerContentCarousel,
  QuickAnswerCarouselButtonType,
  QuickAnswerContentPix,
  PixKeyType,
} from "./quickAnswersTypes";

// ─── helpers ────────────────────────────────────────────────────────────────

export function genId(prefix: string, index: number): string {
  return `${prefix}_${Date.now()}_${index}`;
}

export const PIX_KEY_TYPES: { value: PixKeyType; label: string }[] = [
  { value: "EVP", label: "Aleatória (EVP)" },
  { value: "CPF", label: "CPF" },
  { value: "CNPJ", label: "CNPJ" },
  { value: "PHONE", label: "Telefone" },
  { value: "EMAIL", label: "E-mail" },
];

export const defaultPix = (): QuickAnswerContentPix => ({
  body: "",
  pixKey: "",
  pixType: "EVP",
  pixName: "",
});

export const defaultButtons = (): QuickAnswerContentButtons => ({
  body: "",
  footer: "",
  buttons: [{ id: genId("btn", 0), label: "" }],
});

export const defaultList = (): QuickAnswerContentList => ({
  body: "",
  button_text: "",
  footer: "",
  sections: [
    { title: "", rows: [{ id: genId("row", 0), title: "", description: "" }] },
  ],
});

export const defaultMedia = (): QuickAnswerContentMedia => ({
  media_type: "image",
  url: "",
  caption: "",
});

export const defaultPoll = (): QuickAnswerContentPoll => ({
  question: "",
  options: ["", ""],
  max_selections: 1,
  capture_results: false,
  on_answer: null,
});

export const defaultCarousel = (): QuickAnswerContentCarousel => ({
  body: "",
  cards: [
    {
      image: "",
      title: "",
      footer: "",
      buttons: [{ id: genId("cbtn", 0), label: "", type: "quickreply" }],
    },
  ],
});

// ─── type config ─────────────────────────────────────────────────────────────

export const TYPE_OPTIONS: { value: QuickAnswerType; label: string; description: string }[] = [
  { value: "text", label: "Texto", description: "Mensagem de texto simples com formatação" },
  { value: "interactive_buttons", label: "Botões interativos", description: "Mensagem com até 3 botões clicáveis" },
  { value: "list", label: "Lista", description: "Menu de opções em seções" },
  { value: "media", label: "Mídia", description: "Imagem, vídeo, áudio ou documento" },
  { value: "poll", label: "Enquete", description: "Votação com múltiplas opções" },
  { value: "carousel", label: "Carousel", description: "Cards com imagem, texto e botões" },
  { value: "pix", label: "PIX", description: "Botão de pagamento com chave PIX" },
];

export const CAROUSEL_BUTTON_TYPES: { value: QuickAnswerCarouselButtonType; label: string }[] = [
  { value: "quickreply", label: "Resposta" },
  { value: "url", label: "Link" },
  { value: "call", label: "Ligar" },
  { value: "copy", label: "Copiar" },
];

// ─── validation ───────────────────────────────────────────────────────────────

export interface FormErrors {
  shortcut?: string;
  body?: string;
  question?: string;
  url?: string;
  buttons?: string;
  options?: string;
  [key: string]: string | undefined;
}

export function validate(
  shortcut: string,
  type: QuickAnswerType,
  textBody: string,
  buttons: QuickAnswerContentButtons,
  list: QuickAnswerContentList,
  media: QuickAnswerContentMedia,
  poll: QuickAnswerContentPoll,
  carousel: QuickAnswerContentCarousel,
  pix: QuickAnswerContentPix
): FormErrors {
  const errors: FormErrors = {};
  if (!shortcut || shortcut.length < 2) errors.shortcut = "Atalho deve ter ao menos 2 caracteres";
  if (type === "text" && !textBody.trim()) errors.body = "Mensagem obrigatória";
  if (type === "interactive_buttons") {
    if (!buttons.body.trim()) errors.body = "Mensagem obrigatória";
    if (buttons.buttons.length < 1) errors.buttons = "Adicione ao menos 1 botão";
  }
  if (type === "list" && !list.body.trim()) errors.body = "Mensagem obrigatória";
  if (type === "media" && !media.url.trim()) errors.url = "URL obrigatória";
  if (type === "poll") {
    if (!poll.question.trim()) errors.question = "Pergunta obrigatória";
    if (poll.options.length < 2) errors.options = "Adicione ao menos 2 opções";
  }
  if (type === "carousel") {
    if (carousel.cards.length < 1) errors.cards = "Adicione ao menos 1 card";
    else if (carousel.cards.some((c) => !c.image.trim()))
      errors.cards = "Cada card precisa de uma imagem";
    else if (carousel.cards.some((c) => !c.title.trim()))
      errors.cards = "Cada card precisa de um texto";
  }
  if (type === "pix" && !pix.pixKey.trim()) errors.pixKey = "Chave PIX obrigatória";
  return errors;
}
