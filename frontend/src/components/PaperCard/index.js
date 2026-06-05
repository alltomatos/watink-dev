/* @jsxImportSource react */
import BaseCard from "../BaseCard";

/**
 * PaperCard — Wrapper semântico que substitui <Paper> do MUI.
 * Estilo Apple: flat (elevation=0), bordas sutis, cantos arredondados.
 *
 * Props:
 * - variant: 'outlined' | 'elevated' | 'flush'
 * - padding: 'default' | 'compact' | 'none'
 * - hoverEffect: boolean
 * - onClick: function
 */
const PaperCard = ({
  variant = "outlined",
  padding = "default",
  hoverEffect = false,
  onClick,
  className,
  children,
  ...rest
}) => {
  const variantStyles = {
    outlined: { border: "1px solid var(--border-default)", boxShadow: "none" },
    elevated: { border: "none", boxShadow: "var(--shadow-sm)" },
    flush: { border: "none", boxShadow: "none" },
  };

  const paddingMap = {
    default: { padding: "16px" },
    compact: { padding: "12px" },
    none: { padding: 0 },
  };

  return (
    <BaseCard
      hoverEffect={hoverEffect}
      onClick={onClick}
      className={className}
      style={{
        ...variantStyles[variant],
        ...paddingMap[padding],
      }}
      {...rest}
    >
      {children}
    </BaseCard>
  );
};

export default PaperCard;
