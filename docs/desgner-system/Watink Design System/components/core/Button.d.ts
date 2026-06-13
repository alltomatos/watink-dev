import { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react';

/**
 * @startingPoint section="Components" subtitle="Action button — primary, outlined, ghost, danger" viewport="700x120"
 */
export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Rótulo do botão */
  children: ReactNode;
  /** Variante visual
   * - `primary` — azul preenchido, CTA principal
   * - `outlined` — transparente com borda azul, ação secundária
   * - `ghost` — sem fundo, ação terciária ou nível de navegação
   * - `danger` — vermelho preenchido, ação destrutiva
   */
  variant?: 'primary' | 'outlined' | 'ghost' | 'danger';
  /** Tamanho
   * - `sm` 32px de altura
   * - `md` 40px de altura (padrão)
   * - `lg` 48px de altura
   */
  size?: 'sm' | 'md' | 'lg';
  /** Estado desabilitado */
  disabled?: boolean;
  /** Ícone à esquerda (elemento React) */
  icon?: ReactNode;
  /** Ícone à direita (elemento React) */
  trailingIcon?: ReactNode;
  /** Handler de clique */
  onClick?: () => void;
  /** Tipo HTML do botão */
  type?: 'button' | 'submit' | 'reset';
  /** Ocupa 100% da largura do container */
  fullWidth?: boolean;
  style?: CSSProperties;
  className?: string;
}

export declare function Button(props: ButtonProps): JSX.Element;
export default Button;
