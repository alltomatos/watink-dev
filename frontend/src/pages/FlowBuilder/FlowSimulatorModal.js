import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Stepper,
    Step,
    StepLabel,
    StepContent,
    Paper,
    Chip,
    CircularProgress
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
    PlayArrow as PlayIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Message as MessageIcon,
    FilterList as FilterIcon,
    Storage as DatabaseIcon,
    CallSplit as SwitchIcon
} from '@material-ui/icons';

const useStyles = makeStyles((theme) => ({
    dialogContent: {
        minWidth: 500,
        maxHeight: '70vh'
    },
    messageInput: {
        marginBottom: theme.spacing(2)
    },
    stepper: {
        padding: 0,
        marginTop: theme.spacing(2)
    },
    stepContent: {
        borderLeft: '2px solid #e0e0e0',
        paddingLeft: theme.spacing(2),
        marginLeft: 12
    },
    stepPaper: {
        padding: theme.spacing(1.5),
        background: '#f5f5f5',
        marginBottom: theme.spacing(1)
    },
    chipSuccess: {
        backgroundColor: '#4caf50',
        color: 'white',
        marginRight: theme.spacing(1)
    },
    chipError: {
        backgroundColor: '#f44336',
        color: 'white',
        marginRight: theme.spacing(1)
    },
    chipWarning: {
        backgroundColor: '#ff9800',
        color: 'white',
        marginRight: theme.spacing(1)
    },
    chipInfo: {
        backgroundColor: '#2196f3',
        color: 'white',
        marginRight: theme.spacing(1)
    },
    resultBox: {
        marginTop: theme.spacing(2),
        padding: theme.spacing(2),
        borderRadius: 8,
        background: '#e8f5e9'
    },
    contextBox: {
        marginTop: theme.spacing(2),
        padding: theme.spacing(1.5),
        borderRadius: 4,
        background: '#f5f5f5',
        fontFamily: 'monospace',
        fontSize: 12,
        maxHeight: 150,
        overflow: 'auto'
    }
}));

const getStepIcon = (type) => {
    switch (type) {
        case 'message':
            return <MessageIcon fontSize="small" />;
        case 'filter':
            return <FilterIcon fontSize="small" />;
        case 'database':
            return <DatabaseIcon fontSize="small" />;
        case 'switch':
            return <SwitchIcon fontSize="small" />;
        case 'error':
            return <ErrorIcon fontSize="small" color="error" />;
        case 'warning':
            return <WarningIcon fontSize="small" style={{ color: '#ff9800' }} />;
        case 'end':
            return <SuccessIcon fontSize="small" color="primary" />;
        default:
            return <PlayIcon fontSize="small" />;
    }
};

const FlowSimulatorModal = ({ open, onClose, flowId, flowName, onSimulate }) => {
    const classes = useStyles();
    const [testMessage, setTestMessage] = useState('Olá, teste de simulação');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSimulate = async () => {
        setLoading(true);
        setResult(null);
        try {
            const response = await onSimulate(flowId, testMessage);
            setResult(response);
        } catch (err) {
            setResult({
                success: false,
                error: err.message || 'Erro ao simular fluxo'
            });
        }
        setLoading(false);
    };

    const handleClose = () => {
        setResult(null);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                🎮 Simular Fluxo: {flowName}
            </DialogTitle>
            <DialogContent className={classes.dialogContent}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                    Teste a execução do fluxo sem enviar mensagens reais.
                </Typography>

                <TextField
                    fullWidth
                    variant="outlined"
                    label="Mensagem de teste"
                    placeholder="Digite uma mensagem para simular..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className={classes.messageInput}
                    helperText="Esta mensagem será usada como input inicial do fluxo"
                />

                {loading && (
                    <Box display="flex" alignItems="center" justifyContent="center" py={3}>
                        <CircularProgress size={24} style={{ marginRight: 8 }} />
                        <Typography>Simulando fluxo...</Typography>
                    </Box>
                )}

                {result && result.success && (
                    <>
                        <Box className={classes.resultBox}>
                            <Typography variant="subtitle2" gutterBottom>
                                ✅ Simulação concluída em {result.totalSteps} passos
                            </Typography>
                        </Box>

                        <Typography variant="subtitle2" style={{ marginTop: 16, marginBottom: 8 }}>
                            Passos da Execução:
                        </Typography>

                        <Stepper orientation="vertical" className={classes.stepper}>
                            {result.log.map((step, index) => (
                                <Step key={index} active expanded>
                                    <StepLabel icon={getStepIcon(step.type)}>
                                        <Box display="flex" alignItems="center">
                                            <Chip
                                                size="small"
                                                label={step.type}
                                                className={
                                                    step.type === 'error' ? classes.chipError :
                                                        step.type === 'warning' ? classes.chipWarning :
                                                            step.type === 'end' ? classes.chipSuccess :
                                                                classes.chipInfo
                                                }
                                            />
                                            <Typography variant="body2">
                                                {step.action || step.message}
                                            </Typography>
                                        </Box>
                                    </StepLabel>
                                    <StepContent className={classes.stepContent}>
                                        <Paper elevation={0} className={classes.stepPaper}>
                                            {step.message && (
                                                <Typography variant="body2" color="textSecondary">
                                                    {step.message}
                                                </Typography>
                                            )}
                                            {step.wouldSend && (
                                                <Chip size="small" label="📤 Enviaria mensagem" style={{ marginTop: 4 }} />
                                            )}
                                            {step.options && (
                                                <Box mt={1}>
                                                    {step.options.map((opt, i) => (
                                                        <Chip key={i} size="small" label={opt} style={{ marginRight: 4, marginBottom: 4 }} />
                                                    ))}
                                                </Box>
                                            )}
                                        </Paper>
                                    </StepContent>
                                </Step>
                            ))}
                        </Stepper>

                        <Typography variant="subtitle2" style={{ marginTop: 16 }}>
                            Contexto Final:
                        </Typography>
                        <Box className={classes.contextBox}>
                            <pre>{JSON.stringify(result.finalContext, null, 2)}</pre>
                        </Box>
                    </>
                )}

                {result && !result.success && (
                    <Box className={classes.resultBox} style={{ background: '#ffebee' }}>
                        <Typography color="error">
                            ❌ Erro: {result.error}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    Fechar
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSimulate}
                    disabled={loading || !testMessage.trim()}
                    startIcon={<PlayIcon />}
                >
                    Simular
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FlowSimulatorModal;
