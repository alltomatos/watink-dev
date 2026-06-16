import { HTMLAttributes, CSSProperties } from 'react';

/**
 * @startingPoint section="Components" subtitle="Semantic status pill — success, error, warning, info" viewport="700x80"
 */
export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Status semântico — mapeia para cores de token de design */
  status?: 'success' | 'error' | 'warning' | 'info' | 'default';
  /** Rótulo de texto */
  label: string;
  /** Variante de tamanho */
  size?: 'sm' | 'md' | 'lg';
  /** Exibe ponto colorido indicador antes do rótulo */
  dot?: boolean;
  style?: CSSProperties;
  className?: string;
}

export declare function StatusChip(props: StatusChipProps): JSX.Element;
export default StatusChip;
