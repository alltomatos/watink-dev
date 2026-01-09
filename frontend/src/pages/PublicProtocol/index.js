import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import api from "../../services/api";
import {
    Container,
    Paper,
    Typography,
    Step,
    StepLabel,
    Stepper,
    makeStyles,
    Box,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    Divider,
} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: theme.spacing(4),
        marginTop: theme.spacing(4),
    },
    header: {
        marginBottom: theme.spacing(4),
        textAlign: "center",
    },
    section: {
        marginTop: theme.spacing(4),
    },
    historyItem: {
        backgroundColor: "#f9f9f9",
        borderRadius: "4px",
        marginBottom: "8px",
    },
}));

const PublicProtocol = () => {
    const classes = useStyles();
    const { token } = useParams();
    const [protocol, setProtocol] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProtocol = async () => {
            try {
                const { data } = await api.get(`/public/protocols/${token}`);
                setProtocol(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProtocol();
    }, [token]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" mt={10}>
                <CircularProgress />
            </Box>
        );
    }

    if (!protocol) {
        return (
            <Container maxWidth="sm">
                <Paper className={classes.root}>
                    <Typography variant="h5" align="center" color="error">
                        Protocolo não encontrado
                    </Typography>
                </Paper>
            </Container>
        );
    }

    const getStatusStep = (status) => {
        switch (status) {
            case "open": return 0;
            case "in_progress": return 1;
            case "resolved": return 2;
            case "closed": return 3;
            default: return 0;
        }
    };

    return (
        <Container maxWidth="md">
            <Paper className={classes.root}>
                <div className={classes.header}>
                    <Typography variant="h4" gutterBottom>
                        Protocolo #{protocol.protocolNumber}
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        {protocol.subject}
                    </Typography>
                </div>

                <Stepper activeStep={getStatusStep(protocol.status)} alternativeLabel>
                    <Step>
                        <StepLabel>Aberto</StepLabel>
                    </Step>
                    <Step>
                        <StepLabel>Em Progresso</StepLabel>
                    </Step>
                    <Step>
                        <StepLabel>Resolvido</StepLabel>
                    </Step>
                    <Step>
                        <StepLabel>Fechado</StepLabel>
                    </Step>
                </Stepper>

                <div className={classes.section}>
                    <Typography variant="h6" gutterBottom>
                        Detalhes
                    </Typography>
                    <Typography variant="body1" paragraph>
                        <strong>Descrição:</strong> {protocol.description || "Nenhuma descrição fornecida."}
                    </Typography>
                    <Typography variant="body1">
                        <strong>Data de Criação:</strong> {format(new Date(protocol.createdAt), "dd/MM/yyyy HH:mm")}
                    </Typography>
                </div>

                <div className={classes.section}>
                    <Typography variant="h6" gutterBottom>
                        Histórico
                    </Typography>
                    <List>
                        {protocol.history.map((hist, index) => (
                            <React.Fragment key={hist.id}>
                                <ListItem className={classes.historyItem}>
                                    <ListItemText
                                        primary={hist.comment}
                                        secondary={`${format(new Date(hist.createdAt), "dd/MM/yyyy HH:mm")} - ${hist.user ? hist.user.name : "Sistema"}`}
                                    />
                                </ListItem>
                                {index < protocol.history.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                </div>
            </Paper>
        </Container>
    );
};

export default PublicProtocol;
