/* @jsxImportSource react */
import clsx from "clsx";

/**
 * BaseCard — Container puramente semântico para o Design System Apple.
 * NÃO utiliza makeStyles ou Material-UI para estilização.
 * Estilização via CSS Variables globais (semantic.js).
 */
const BaseCard = ({
  title,
  subtitle,
  icon,
  iconColor,
  actions,
  hoverEffect = false,
  onClick,
  className,
  children,
  style,
  ...rest
}) => {
  return (
    <div
      className={clsx("base-card", className)}
      onClick={onClick}
      style={{
        backgroundColor: "var(--bg-surface)",
        borderRadius: "16px", // Apple-style corner
        border: "1px solid var(--border-default)",
        boxShadow: hoverEffect ? "var(--shadow-md)" : "none",
        transition: "all var(--duration-normal) var(--ease-out)",
        overflow: "hidden",
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      {...rest}
    >
      {(title || icon || actions) && (
        <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: title ? "1px solid var(--border-subtle)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {icon && (
              <div style={{ 
                width: 40, height: 40, borderRadius: 10, 
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: iconColor || "var(--action-primary-bg)"
              }}>
                {icon}
              </div>
            )}
            <div>
              {title && <div style={{ fontWeight: 600, fontSize: "1.1rem", color: "var(--text-primary)" }}>{title}</div>}
              {subtitle && <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{subtitle}</div>}
            </div>
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
};

export default BaseCard;
