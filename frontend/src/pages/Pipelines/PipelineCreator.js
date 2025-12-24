import React, { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
    Paper,
    Grid,
    TextField,
    Button,
    Typography,
    Box,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
    RadioGroup,
    FormControlLabel,
    Radio,
    Divider,
    Avatar,
    InputAdornment,
    CircularProgress
} from "@material-ui/core";
import DeleteIcon from "@material-ui/icons/Delete";
import AddIcon from "@material-ui/icons/Add";
import SendIcon from "@material-ui/icons/Send";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import AndroidIcon from "@material-ui/icons/Android"; // Robot icon
import PersonIcon from "@material-ui/icons/Person";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
    root: {
        flex: 1,
        height: "100%",
        display: "flex",
        flexDirection: "column",
    },
    container: {
        flex: 1,
        display: "flex",
        overflow: "hidden", // prevent window scroll
        gap: theme.spacing(2),
        padding: theme.spacing(2),
        height: "100%"
    },
    formArea: {
        flex: 2, // 66%
        padding: theme.spacing(3),
        overflowY: "auto",
        ...theme.scrollbarStyles,
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(2)
    },
    chatArea: {
        flex: 1, // 33% (Drawer like)
        display: "flex",
        flexDirection: "column",
        borderLeft: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.type === 'dark' ? '#1e293b' : '#f8fafc',
    },
    chatMessages: {
        flex: 1,
        padding: theme.spacing(2),
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(2),
    },
    chatInputContainer: {
        padding: theme.spacing(2),
        borderTop: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
    },
    messageBubble: {
        padding: theme.spacing(1.5),
        borderRadius: "12px",
        maxWidth: "90%",
        position: "relative",
        wordBreak: "break-word"
    },
    userMessage: {
        alignSelf: "flex-end",
        backgroundColor: theme.palette.primary.main,
        color: "#fff",
        borderBottomRightRadius: 0,
    },
    aiMessage: {
        alignSelf: "flex-start",
        backgroundColor: theme.palette.type === 'dark' ? '#334155' : '#e2e8f0',
        color: theme.palette.text.primary,
        borderBottomLeftRadius: 0,
    },
    stageItem: {
        backgroundColor: theme.palette.background.default,
        marginBottom: theme.spacing(1),
        borderRadius: theme.spacing(1),
        border: `1px solid ${theme.palette.divider}`
    }
}));

const PipelineCreator = () => {
    const classes = useStyles();
    const history = useHistory();
    const messagesEndRef = useRef(null);

    const [data, setData] = useState({
        name: "",
        description: "",
        type: "kanban",
        stages: ["Novo", "Em Andamento", "Concluído"]
    });
    const [loading, setLoading] = useState(false);

    // Chat State
    const [messages, setMessages] = useState([
        {
            role: "ai",
            content: "Olá! Eu sou o assistente de IA do Watic. \nDescreva o processo que você deseja gerenciar (ex: Vendas de Imóveis, Suporte Técnico) e eu criarei as etapas ideais para você."
        }
    ]);
    const [input, setInput] = useState("");
    const [aiLoading, setAiLoading] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSave = async () => {
        if (!data.name) {
            toast.error("O nome do pipeline é obrigatório");
            return;
        }
        setLoading(true);
        try {
            const payload = {
                ...data,
                stages: data.stages.map(stage => ({ name: stage }))
            };
            await api.post("/pipelines", payload);
            toast.success("Pipeline criado com sucesso!");
            history.push("/pipelines");
        } catch (err) {
            toast.error("Erro ao criar pipeline");
        }
        setLoading(false);
    };

    const handleStageChange = (index, value) => {
        const newStages = [...data.stages];
        newStages[index] = value;
        setData({ ...data, stages: newStages });
    };

    const handleAddStage = () => {
        setData({ ...data, stages: [...data.stages, "Nova Etapa"] });
    };

    const handleRemoveStage = (index) => {
        const newStages = data.stages.filter((_, i) => i !== index);
        setData({ ...data, stages: newStages });
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        const userMsg = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setAiLoading(true);

        try {
            // Call AI Endpoint
            const { data: aiData } = await api.post("/pipelines/ai-suggest", {
                prompt: userMsg.content,
                currentStages: data.stages
            });

            if (aiData.stages && Array.isArray(aiData.stages)) {
                // Apply suggestion
                setData(prev => ({ ...prev, stages: aiData.stages }));

                const aiMsg = {
                    role: "ai",
                    content: `Entendido! Gere com base na sua descrição: \n\n${aiData.stages.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nJá apliquei essas etapas no formulário ao lado. Você pode editá-las se quiser!`
                };
                setMessages(prev => [...prev, aiMsg]);
                toast.success("Sugestão da IA aplicada!");
            } else {
                const aiMsg = {
                    role: "ai",
                    content: "Desculpe, não consegui gerar etapas claras para essa descrição. Tente ser mais específico."
                };
                setMessages(prev => [...prev, aiMsg]);
            }

        } catch (err) {
            console.error(err);
            const errorMessage = err.response?.data?.error || err.message || "Erro desconhecido";
            const errorMsg = { role: "ai", content: `Ocorreu um erro: ${errorMessage}. Verifique se a API Key está configurada.` };
            setMessages(prev => [...prev, errorMsg]);
        }
        setAiLoading(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <MainContainer className={classes.root}>
            <MainHeader>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IconButton onClick={() => history.push("/pipelines")}>
                        <ArrowBackIcon />
                    </IconButton>
                    <Title>Novo Pipeline</Title>
                </div>
            </MainHeader>

            <Paper className={classes.container} variant="outlined">
                {/* Left Side: Form */}
                <Box className={classes.formArea}>
                    <Typography variant="h6" gutterBottom>Definições</Typography>

                    <TextField
                        label="Nome do Pipeline"
                        variant="outlined"
                        fullWidth
                        value={data.name}
                        onChange={(e) => setData({ ...data, name: e.target.value })}
                        required
                    />

                    <TextField
                        label="Descrição"
                        variant="outlined"
                        fullWidth
                        multiline
                        rows={2}
                        value={data.description}
                        onChange={(e) => setData({ ...data, description: e.target.value })}
                    />

                    <Typography variant="subtitle2" style={{ marginTop: 16 }}>Tipo de Visualização</Typography>
                    <RadioGroup
                        row
                        value={data.type}
                        onChange={(e) => setData({ ...data, type: e.target.value })}
                    >
                        <FormControlLabel value="kanban" control={<Radio color="primary" />} label="Kanban (Colunas)" />
                        <FormControlLabel value="funnel" control={<Radio color="primary" />} label="Funil (Lista)" />
                    </RadioGroup>

                    <Divider style={{ margin: '16px 0' }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6">Etapas ({data.stages.length})</Typography>
                        <Button startIcon={<AddIcon />} color="primary" onClick={handleAddStage}>Adicionar</Button>
                    </div>

                    <List dense>
                        {data.stages.map((stage, index) => (
                            <div key={index} className={classes.stageItem}>
                                <ListItem>
                                    <div style={{ marginRight: 16, color: '#888' }}>{index + 1}.</div>
                                    <TextField
                                        fullWidth
                                        value={stage}
                                        onChange={(e) => handleStageChange(index, e.target.value)}
                                        variant="standard"
                                        InputProps={{ disableUnderline: true }}
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton edge="end" onClick={() => handleRemoveStage(index)} size="small">
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItem>
                            </div>
                        ))}
                    </List>

                    <Box mt="auto" pt={2} display="flex" justifyContent="flex-end" gap={2}>
                        <Button onClick={() => history.push("/pipelines")}>Cancelar</Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleSave}
                            disabled={loading || !data.name}
                        >
                            {loading ? <CircularProgress size={24} /> : "Salvar Pipeline"}
                        </Button>
                    </Box>
                </Box>

                {/* Right Side: Chat Drawer */}
                <Paper className={classes.chatArea} elevation={0}>
                    <Box p={2} borderBottom="1px solid rgba(0,0,0,0.12)" display="flex" alignItems="center" gap={1}>
                        <AndroidIcon color="secondary" />
                        <Typography variant="subtitle1" style={{ fontWeight: 600 }}>IA Assistant</Typography>
                    </Box>

                    <div className={classes.chatMessages}>
                        {messages.map((msg, i) => (
                            <div key={i} className={`${classes.messageBubble} ${msg.role === 'user' ? classes.userMessage : classes.aiMessage}`}>
                                <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
                            </div>
                        ))}
                        {aiLoading && (
                            <div className={`${classes.messageBubble} ${classes.aiMessage}`}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <CircularProgress size={16} color="inherit" />
                                    <Typography variant="caption">Pensando...</Typography>
                                </Box>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className={classes.chatInputContainer}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Descreva seu processo..."
                            size="small"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={aiLoading}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={handleSendMessage} disabled={!input.trim() || aiLoading} color="primary">
                                            <SendIcon />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                        <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginTop: 4, textAlign: 'center' }}>
                            A IA atualizará as etapas automaticamente.
                        </Typography>
                    </div>
                </Paper>
            </Paper>
        </MainContainer>
    );
};

export default PipelineCreator;
