import React from "react";
import BaseCard, { BaseCardProps } from "../BaseCard";

type Variant = "outlined" | "elevated" | "flush";
type Padding = "default" | "compact" | "none";

interface PaperCardProps extends Omit<BaseCardProps, "style"> {
  variant?: Variant;
  padding?: Padding;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  outlined: { border: "1px solid var(--border-default)", boxShadow: "none" },
  elevated: { border: "none", boxShadow: "var(--shadow-sm)" },
  flush: { border: "none", boxShadow: "none" },
};

const paddingMap: Record<Padding, React.CSSProperties> = {
  default: { padding: "16px" },
  compact: { padding: "12px" },
  none: { padding: 0 },
};

const PaperCard: React.FC<PaperCardProps> = ({
  variant = "outlined",
  padding = "default",
  hoverEffect = false,
  onClick,
  className,
  children,
  ...rest
}) => (
  <BaseCard
    hoverEffect={hoverEffect}
    onClick={onClick}
    className={className}
    style={{ ...variantStyles[variant], ...paddingMap[padding] }}
    {...rest}
  >
    {children}
  </BaseCard>
);

export default PaperCard;
