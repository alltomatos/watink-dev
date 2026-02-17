/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardActions,
    Button,
    Box,
    CircularProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from "@material-ui/core";
import {
    CheckCircle as CheckCircleIcon,
    Payment as PaymentIcon,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import pluginApi from "../../services/pluginApi";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: theme.spacing(3),
    },
    title: {
        fontWeight: 600,
        marginBottom: theme.spacing(4),
    },
    card: {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${theme.palette.divider}`,
    },
    cardHeader: {
        backgroundColor: theme.palette.grey[50],
        padding: theme.spacing(2),
        textAlign: "center",
        borderBottom: `1px solid ${theme.palette.divider}`,
    },
    price: {
        fontSize: "2.5rem",
        fontWeight: 700,
        color: theme.palette.primary.main,
    },
    period: {
        fontSize: "1rem",
        color: theme.palette.text.secondary,
    },
    featureList: {
        flexGrow: 1,
        padding: theme.spacing(2),
    },
    activeCard: {
        border: `2px solid ${theme.palette.primary.main}`,
        boxShadow: theme.shadows[4],
    },
    instanceBox: {
        marginTop: theme.spacing(4),
        padding: theme.spacing(2),
        backgroundColor: theme.palette.info.light,
        borderRadius: theme.shape.borderRadius,
    }
}));

const Billing = () => {
    const classes = useStyles();
    const [loading, setLoading] = useState(false);
    const [instanceId, setInstanceId] = useState("");

    useEffect(() => {
        const loadInstanceId = async () => {
            try {
                const { data } = await pluginApi.get("/plugins/instance");
                setInstanceId(data.instanceId);
            } catch (err) {
                console.error("Erro ao carregar ID");
            }
        };
        loadInstanceId();
    }, []);

    const handleCheckout = (plan) => {
        toast.info(`Iniciando checkout do plano ${plan}...`);
        // Aqui redirecionaremos para a Edge Function do Supabase que gera o link do MP
        // window.location.href = `https://quxtkdxrafulqibwbqld.supabase.co/functions/v1/create-checkout?plan=${plan}&instanceId=${instanceId}`;
        window.open(`https://quxtkdxrafulqibwbqld.supabase.co/functions/v1/create-checkout?plan=${plan}&instanceId=${instanceId}`, "_blank");
    };

    const plans = [
        {
            name: "Start",
            price: "49,99",
            limit: "4 plugins",
            features: ["Até 4 plugins Business", "Suporte Standard", "Atualizações Core", "Webchat incluso"],
        },
        {
            name: "Pro",
            price: "99,99",
            limit: "6 plugins",
            features: ["Até 6 plugins Business", "Suporte Prioritário", "Todas as Engines (WhatsMeow/Papi)", "Acesso antecipado"],
        },
        {
            name: "SaaS",
            price: "199,99",
            limit: "Módulo SaaS",
            features: ["Plugin de Gestão SaaS", "Painel Multi-instância", "White-label habilitado", "Faturamento centralizado"],
        }
    ];

    return (
        <Container maxWidth="lg" className={classes.root}>
            <Typography variant="h4" className={classes.title}>
                💳 Assinatura e Planos
            </Typography>

            <Grid container spacing={4}>
                {plans.map((plan) => (
                    <Grid item xs={12} sm={4} key={plan.name}>
                        <Card className={classes.card}>
                            <Box className={classes.cardHeader}>
                                <Typography variant="h5">{plan.name}</Typography>
                                <Box display="flex" justifyContent="center" alignItems="baseline">
                                    <Typography className={classes.price}>R$ {plan.price}</Typography>
                                    <Typography className={classes.period}>/mês</Typography>
                                </Box>
                                <Typography variant="subtitle2" color="textSecondary">
                                    {plan.limit}
                                </Typography>
                            </Box>
                            <CardContent className={classes.featureList}>
                                <List dense>
                                    {plan.features.map((feature) => (
                                        <ListItem key={feature}>
                                            <ListItemIcon style={{ minWidth: 32 }}>
                                                <CheckCircleIcon color="primary" fontSize="small" />
                                            </ListItemIcon>
                                            <ListItemText primary={feature} />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                            <CardActions style={{ padding: 16 }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PaymentIcon />}
                                    onClick={() => handleCheckout(plan.name)}
                                >
                                    Assinar Agora
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {instanceId && (
                <Box className={classes.instanceBox}>
                    <Typography variant="body1">
                        <strong>Seu Instance ID:</strong> {instanceId}
                    </Typography>
                    <Typography variant="caption">
                        Este ID identifica sua instalação única do Watink e é necessário para validar sua licença após o pagamento.
                    </Typography>
                </Box>
            )}
        </Container>
    );
};

export default Billing;
