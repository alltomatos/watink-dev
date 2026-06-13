import { HTMLAttributes, ReactNode, CSSProperties } from 'react';

/**
 * @startingPoint section="Components" subtitle="Dashboard metric card — big number, label, trend badge" viewport="700x200"
 */
export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Rótulo descritivo curto (renderizado em MAIÚsCULAS) ex: "Tickets Abertos" */
  label: string;
  /** Valor principal — número grande em destaque ex: "142" ou "8m 32s" */
  value: string | number;
  /** Ícone opcional (elemento React). Dimensionado automaticamente para 28px. */
  icon?: ReactNode;
  /** Tema de cor — controla gradiente do ícone + cor do texto do valor */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** Badge opcional de tendência */
  trend?: {
    /** Valor exibido ex: "+12%" ou "−3min" */
    value: string;
    /** true = seta verde para cima, false = seta vermelha para baixo */
    positive: boolean;
  };
  style?: CSSProperties;
  className?: string;
}

export declare function MetricCard(props: MetricCardProps): JSX.Element;
export default MetricCard;
