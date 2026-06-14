import * as React from "react";
import { VariantProps } from "class-variance-authority";
import { avatarVariants } from "./Avatar";

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  /** URL da imagem do avatar — cai para iniciais em caso de erro */
  src?: string | null;
  /** Nome completo usado para gerar iniciais (1-2 letras) e cor de fundo determinística */
  name?: string;
  /** Exibe ponto de status online (verde) no canto inferior direito */
  online?: boolean;
}

/**
 * Avatar de usuário - Componente Core Watink
 * @see Avatar.tsx para implementação baseada em shadcn/ui
 */
export declare const Avatar: React.ForwardRefExoticComponent<AvatarProps & React.RefAttributes<HTMLDivElement>>;

export default Avatar;
