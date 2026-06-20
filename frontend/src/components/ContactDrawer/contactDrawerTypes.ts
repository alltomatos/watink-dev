export interface Stage {
  id: number;
  name: string;
}

export interface Pipeline {
  id: number;
  name: string;
  stages: Stage[];
}

export interface Deal {
  id: number;
  title: string;
  pipeline?: { name: string };
  stage?: { id: number; name: string };
}

export interface Contact {
  id: number;
  name: string;
  number?: string;
  email?: string;
  lid?: string;
  profilePicUrl?: string;
  isGroup?: boolean;
  clients?: unknown[];
}

export interface ContactDrawerProps {
  open: boolean;
  handleDrawerClose: () => void;
  contact: Contact;
  ticketId: number;
  loading: boolean;
}

/* ─── Stage color tokens (same palette as PipelineBoard) ───────────── */
export const stageColors = [
  { bg: "var(--status-info-bg)", header: "var(--status-info)" },
  { bg: "var(--status-warning-bg)", header: "var(--status-warning)" },
  { bg: "var(--status-success-bg)", header: "var(--status-success)" },
  { bg: "var(--status-error-bg)", header: "var(--status-error)" },
  { bg: "var(--status-default-bg)", header: "var(--status-default-text)" },
];

export const getStageColor = (index: number) => stageColors[index % stageColors.length];
