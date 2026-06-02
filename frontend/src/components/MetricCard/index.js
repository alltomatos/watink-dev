/* @jsxImportSource react */
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Card, CardContent, Typography, Box } from "@material-ui/core";
import { TrendingUp, TrendingDown } from "@material-ui/icons";
import clsx from "clsx";

const useStyles = makeStyles((theme) => ({
    root: {
        backgroundColor: "var(--bg-surface)",
        borderRadius: 16,
        border: "none",
        boxShadow: "0px 4px 20px var(--shadow-medium)",
        transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
        overflow: "visible",
        height: "100%",
        "&:hover": {
            transform: "translateY(-6px)",
            boxShadow: "0 20px 25px -5px var(--shadow-appbar), 0 10px 10px -5px var(--overlay-weak)",
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
        width: 56,
        height: 56,
        borderRadius: 16,
        background: (props) => props.bgColor,
        boxShadow: "0 4px 6px var(--border-subtle)",
    },
    label: {
        fontSize: "0.875rem",
        fontWeight: 600,
        color: "var(--text-muted)",
        marginBottom: theme.spacing(0.5),
        textTransform: "uppercase",
        letterSpacing: "0.5px",
    },
    value: {
        fontSize: "2.5rem",
        fontWeight: 800,
        color: (props) => props.textColor || "var(--text-primary)",
        lineHeight: 1.2,
    },
    footer: {
        display: "flex",
        alignItems: "center",
        marginTop: theme.spacing(2),
    },
    trendPositive: {
        display: "flex",
        alignItems: "center",
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "var(--status-success)",
        backgroundColor: "var(--status-success-10)",
        padding: "4px 10px",
        borderRadius: 20,
    },
    trendNegative: {
        display: "flex",
        alignItems: "center",
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "var(--status-error)",
        backgroundColor: "var(--status-error-10)",
        padding: "4px 10px",
        borderRadius: 20,
    },
    trendIcon: {
        fontSize: 16,
        marginRight: 4,
    },
}));

// Mapeia cores do tema para valores RGB e Gradients
const colorMap = {
    primary: {
        bg: "linear-gradient(135deg, var(--status-info-4) 0%, var(--status-info-8) 100%)",
        icon: "var(--status-info)",
        text: "var(--status-info)"
    },
    success: {
        bg: "linear-gradient(135deg, var(--status-success-10) 0%, var(--status-success-bg) 100%)",
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
    const classes = useStyles({ bgColor: colors.bg, textColor: colors.text });

    return (
        <Card className={clsx(classes.root, className)} {...rest}>
            <CardContent className={classes.content}>
                <div className={classes.header}>
                    <div className={classes.iconWrapper}>
                        {icon && React.cloneElement(icon, {
                            style: { color: colors.icon, fontSize: 30 }
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
