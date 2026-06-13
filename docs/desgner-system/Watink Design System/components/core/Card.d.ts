import { HTMLAttributes, ReactNode, CSSProperties } from 'react';

/**
 * @startingPoint section="Components" subtitle="Base content card with header, icon, and body slot" viewport="700x200"
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Título do card */
  title?: string;
  /** Subtítulo / texto secundário abaixo do título */
  subtitle?: ReactNode;
  /** Ícone exibido em um quadrado colorido */
  icon?: ReactNode;
  /** Cor de fundo do container do ícone (padrão: --status-info-8) */
  iconColor?: string;
  /** Elementos de ação renderizados no canto superior direito do header */
  actions?: ReactNode;
  /** Animação de elevação no hover — translateY(-6px) + sombra mais profunda */
  hoverEffect?: boolean;
  /** Torna o card inteiro clicável */
  onClick?: () => void;
  /** Conteúdo do corpo do card */
  children?: ReactNode;
  /** Sobrescreve o padding interno (padrão 24px) */
  padding?: string | number;
  style?: CSSProperties;
  className?: string;
}

export declare function Card(props: CardProps): JSX.Element;
export default Card;
