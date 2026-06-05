/* @jsxImportSource react */
import React from "react";
import clsx from "clsx";
import { TrendingUp, TrendingDown } from "@material-ui/icons";

// Mapeia cores do tema para valores RGB e Gradients
const colorMap = {
    primary: {
        bg: "linear-gradient(135deg, var(--status-info-4) 0%, var(--status-info-8) 100%)",
        icon: "var(--status-info)",
        text: "var(--status-info)"
    },
    success: {
        bg: "linear-gradient(135deg, var(--status-success-bg) 0%, var(--status-success-10) 100%)",
        icon: "var(--status-success)",
        text: "var(--status-success)"
    },
    warning: {
        bg: "linear-gradient(135deg, var(--status-warning-bg) 0%, var(--status-warning-bg) 100%)",
        icon: "var(--status-warning)",
        text: "var(--status-warning)"
    },
    error: {
        bg: "linear-gradient(135deg, var(--status-error-10) 0%, var(--status-error-bg) 100%)",
        icon: "var(--status-error)",
        text: "var(--status-error)"
    },
    info: {
        bg: "linear-gradient(135deg, var(--status-info-4) 0%, var(--status-info-8) 100%)",
        icon: "var(--status-info)",
        text: "var(--status-info)"
    },
};

/**
 * MetricCard Component — Semântico e token-based.
 * Card de métricas para dashboards com visual premium.
 * 
 * @param {Object} props
 * @param {string} props.label - Título/descrição da métrica
 * @param {string|number} props.value - Valor numérico grande
 * @param {React.ReactNode} props.icon - Ícone representativo
 * @param {string} props.color - Cor do tema (primary, success, warning, error, info)
 * @param {Object} props.trend - Opcional: { value: "+5%", positive: true }
 * @param {string} props.className - Classes CSS customizadas
 */
const MetricCard = ({
    label,
    value,
    icon,
    color = "primary",
    trend,
    className,
    ...rest
}) => {
    const colors = colorMap[color] || colorMap.primary;

    return (
        <div
            className={clsx("metric-card", className)}
            style={{
                backgroundColor: "var(--bg-surface)",
                borderRadius: 16,
                boxShadow: "0px 4px 20px var(--shadow-medium)",
                transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
                overflow: "visible",
                height: "100%",
                "&:hover": {
                    transform: "translateY(-6px)",
                    boxShadow: "0 20px 25px -5px var(--shadow-lg), 0 10px 10px -5px var(--overlay-dark)",
                },
            }}
            {...rest}
        >
            <div style={{ padding: "16px" }}>
                {/* Header with icon */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            background: colors.bg,
                            boxShadow: "0 4px 6px var(--shadow-subtle)",
                        }}
                    >
                        {icon && React.cloneElement(icon, {
                            style: { color: colors.icon, fontSize: 30 }
                        })}
                    </div>
                </div>

                {/* Label */}
                <div
                    style={{
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                    }}
                >
                    {label}
                </div>

                {/* Value */}
                <div
                    style={{
                        fontSize: "2.5rem",
                        fontWeight: 800,
                        color: colors.text || "var(--text-primary)",
                        lineHeight: 1.2,
                    }}
                >
                    {value}
                </div>

                {/* Trend */}
                {trend && (
                    <div style={{ display: "flex", alignItems: "center", marginTop: "16px" }}>
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: trend.positive ? "var(--status-success)" : "var(--status-error)",
                                backgroundColor: trend.positive ? "var(--status-success-bg)" : "var(--status-error-bg)",
                                padding: "4px 10px",
                                borderRadius: 20,
                            }}
                        >
                            {trend.positive
                                ? <TrendingUp style={{ fontSize: 16, marginRight: 4 }} />
                                : <TrendingDown style={{ fontSize: 16, marginRight: 4 }} />
                            }
                            {trend.value}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MetricCard;