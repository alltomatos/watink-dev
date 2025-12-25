import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Card, CardContent, Typography, Box } from "@material-ui/core";
import { TrendingUp, TrendingDown } from "@material-ui/icons";
import clsx from "clsx";

const useStyles = makeStyles((theme) => ({
    root: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        border: "none",
        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.08)",
        transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
        overflow: "visible",
        height: "100%",
        "&:hover": {
            transform: "translateY(-6px)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        },
    },
    content: {
        padding: theme.spacing(3),
        "&:last-child": {
            paddingBottom: theme.spacing(3),
        },
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: theme.spacing(2),
    },
    iconWrapper: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: (props) => props.bgColor || "#E3F2FD",
    },
    label: {
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "#64748b",
        marginBottom: theme.spacing(0.5),
    },
    value: {
        fontSize: "2.25rem",
        fontWeight: 700,
        color: "#1e293b",
        lineHeight: 1.2,
    },
    footer: {
        display: "flex",
        alignItems: "center",
        marginTop: theme.spacing(1),
    },
    trendPositive: {
        display: "flex",
        alignItems: "center",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#10b981",
        backgroundColor: "#d1fae5",
        padding: "2px 8px",
        borderRadius: 12,
    },
    trendNegative: {
        display: "flex",
        alignItems: "center",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#ef4444",
        backgroundColor: "#fee2e2",
        padding: "2px 8px",
        borderRadius: 12,
    },
    trendIcon: {
        fontSize: 14,
        marginRight: 2,
    },
}));

// Mapeia cores do tema para valores RGB
const colorMap = {
    primary: { bg: "#E3F2FD", icon: "#1976d2" },
    success: { bg: "#E8F5E9", icon: "#4caf50" },
    warning: { bg: "#FFF3E0", icon: "#ff9800" },
    error: { bg: "#FFEBEE", icon: "#f44336" },
    info: { bg: "#E1F5FE", icon: "#03a9f4" },
};

/**
 * MetricCard Component
 * 
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
    const classes = useStyles({ bgColor: colors.bg });

    return (
        <Card className={clsx(classes.root, className)} {...rest}>
            <CardContent className={classes.content}>
                <div className={classes.header}>
                    <div className={classes.iconWrapper}>
                        {icon && React.cloneElement(icon, {
                            style: { color: colors.icon, fontSize: 24 }
                        })}
                    </div>
                </div>

                <Typography className={classes.label}>
                    {label}
                </Typography>

                <Typography className={classes.value}>
                    {value}
                </Typography>

                {trend && (
                    <div className={classes.footer}>
                        <span className={trend.positive ? classes.trendPositive : classes.trendNegative}>
                            {trend.positive
                                ? <TrendingUp className={classes.trendIcon} />
                                : <TrendingDown className={classes.trendIcon} />
                            }
                            {trend.value}
                        </span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default MetricCard;
