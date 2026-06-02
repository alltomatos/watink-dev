/* @jsxImportSource react */
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Card, CardContent, Typography, Divider, Box } from "@material-ui/core";
import clsx from "clsx";

const useStyles = makeStyles((theme) => ({
    root: {
        backgroundColor: "var(--bg-surface)",
        borderRadius: 16,
        border: "none",
        boxShadow: "0px 4px 20px var(--shadow-medium)",
        overflow: "hidden",
    },
    header: {
        padding: theme.spacing(2, 3),
        borderLeft: (props) => props.headerColor
            ? `4px solid ${props.headerColor}`
            : "4px solid var(--status-info)",
        backgroundColor: (props) => props.headerBg || "var(--bg-surface)",
    },
    headerContent: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    title: {
        fontWeight: 700,
        fontSize: "1.125rem",
        color: "var(--text-primary)",
    },
    subtitle: {
        fontSize: "0.875rem",
        color: "var(--text-muted)",
        marginTop: theme.spacing(0.5),
    },
    headerActions: {
        display: "flex",
        gap: theme.spacing(1),
    },
    body: {
        padding: theme.spacing(3),
    },
    footer: {
        padding: theme.spacing(2, 3),
        backgroundColor: "var(--bg-surface)",
        borderTop: "1px solid var(--border-default)",
        display: "flex",
        justifyContent: "flex-end",
        gap: theme.spacing(1),
    },
}));

/**
 * InfoCard Component
 * 
 * Card para exibir informações detalhadas com header, body e footer.
 * Ideal para configurações, detalhes de registro, formulários, etc.
 * 
 * @param {Object} props
 * @param {string} props.title - Título do card
 * @param {string} props.subtitle - Subtítulo opcional
 * @param {string} props.headerColor - Cor da borda esquerda do header
 * @param {React.ReactNode} props.headerActions - Ações no header (ícones, botões)
 * @param {React.ReactNode} props.children - Conteúdo do body
 * @param {React.ReactNode} props.actions - Botões no footer
 * @param {boolean} props.noPadding - Remove padding do body (para tabelas, etc)
 * @param {string} props.className - Classes CSS customizadas
 */
const InfoCard = ({
    title,
    subtitle,
    headerColor,
    headerActions,
    children,
    actions,
    noPadding = false,
    className,
    ...rest
}) => {
    const classes = useStyles({ headerColor });

    return (
        <Card className={clsx(classes.root, className)} {...rest}>
            {title && (
                <div className={classes.header}>
                    <div className={classes.headerContent}>
                        <div>
                            <Typography className={classes.title}>
                                {title}
                            </Typography>
                            {subtitle && (
                                <Typography className={classes.subtitle}>
                                    {subtitle}
                                </Typography>
                            )}
                        </div>
                        {headerActions && (
                            <div className={classes.headerActions}>
                                {headerActions}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className={classes.body} style={noPadding ? { padding: 0 } : undefined}>
                {children}
            </div>

            {actions && (
                <div className={classes.footer}>
                    {actions}
                </div>
            )}
        </Card>
    );
};

export default InfoCard;
