import { HTMLAttributes, CSSProperties } from 'react';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** URL da imagem — usa iniciais como fallback em caso de erro */
  src?: string;
  /** Nome completo usado para gerar fallback de 1–2 iniciais */
  name?: string;
  /** Variante de tamanho */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Se informado, renderiza ponto de status: true = online (verde), false = offline (cinza) */
  online?: boolean;
  style?: CSSProperties;
  className?: string;
}

export declare function Avatar(props: AvatarProps): JSX.Element;
export default Avatar;
