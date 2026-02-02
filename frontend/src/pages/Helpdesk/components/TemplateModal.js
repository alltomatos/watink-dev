import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogActions,
    Button,
    TextField,
    Grid,
    IconButton,
    Typography,
    Box,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Checkbox,
    FormControlLabel,
    Paper
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import {
    Close as CloseIcon,
    Save as SaveIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    DragHandle as DragHandleIcon
} from "@material-ui/icons";
import { toast } from "react-toastify";
import activityApi from "../../../services/activityApi";

const useStyles = makeStyles((theme) => ({
    dialogPaper: {
        borderRadius: 16,
        padding: theme.spacing(1),
    },
    dialogTitle: {
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        paddingBottom: theme.spacing(2),
        "& h2": {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 700,
        }
    },
    sectionTitle: {
        fontWeight: 600,
        marginBottom: theme.spacing(2),
        marginTop: theme.spacing(2),
    },
    itemRow: {
        backgroundColor: "#f9f9f9",
        borderRadius: 8,
        marginBottom: theme.spacing(1),
        padding: theme.spacing(1),
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(2)
    }
}));

const TemplateModal = ({ open, onClose, templateId }) => {
    const classes = useStyles();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [template, setTemplate] = useState({
        name: "",
        description: "",
        items: []
    });

    useEffect(() => {
        if (open) {
            if (templateId) {
                loadTemplate(templateId);
            } else {
                setTemplate({
                    name: "",
                    description: "",
                    items: []
                });
            }
        }
    }, [open, templateId]);

    const loadTemplate = async (id) => {
        setLoading(true);
        try {
            const { data } = await activityApi.showTemplate(id);
            setTemplate(data);
        } catch (err) {
            toast.error("Erro ao carregar template");
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!template.name) {
            toast.warning("Nome é obrigatório");
            return;
        }

        setSaving(true);
        try {
            if (templateId) {
                await activityApi.updateTemplate(templateId, template);
            } else {
                await activityApi.createTemplate(template);
            }
            toast.success("Template salvo com sucesso!");
            onClose();
        } catch (err) {
            toast.error("Erro ao salvar template");
        } finally {
            setSaving(false);
        }
    };

    const handleAddItem = () => {
        setTemplate(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    label: "",
                    inputType: "text",
                    isRequired: false
                }
            ]
        }));
    };

    const handleRemoveItem = (index) => {
        const newItems = template.items.filter((_, i) => i !== index);
        setTemplate(prev => ({ ...prev, items: newItems }));
    };

    const handleChangeItem = (index, field, value) => {
        const newItems = [...template.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setTemplate(prev => ({ ...prev, items: newItems }));
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            classes={{ paper: classes.dialogPaper }}
        >
            <DialogTitle className={classes.dialogTitle}>
                {templateId ? "Editar Template" : "Novo Template"}
                <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent style={{ padding: 24 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Nome do Modelo"
                            fullWidth
                            variant="outlined"
                            value={template.name}
                            onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Descrição"
                            fullWidth
                            multiline
                            rows={3}
                            variant="outlined"
                            value={template.description}
                            onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography className={classes.sectionTitle}>
                                Itens de Checklist Padrão
                            </Typography>
                            <Button
                                startIcon={<AddIcon />}
                                size="small"
                                color="primary"
                                onClick={handleAddItem}
                            >
                                Adicionar Item
                            </Button>
                        </Box>

                        {template.items && template.items.map((item, index) => (
                            <div key={index} className={classes.itemRow}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    placeholder="Descrição da ação..."
                                    value={item.label}
                                    onChange={(e) => handleChangeItem(index, "label", e.target.value)}
                                    variant="outlined"
                                />
                                <Box minWidth={150}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={item.inputType === "photo"}
                                                onChange={(e) => handleChangeItem(index, "inputType", e.target.checked ? "photo" : "text")}
                                                color="primary"
                                            />
                                        }
                                        label="Requer Foto"
                                    />
                                </Box>
                                <IconButton size="small" onClick={() => handleRemoveItem(index)}>
                                    <DeleteIcon />
                                </IconButton>
                            </div>
                        ))}
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions style={{ padding: 16 }}>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    color="primary"
                    variant="contained"
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={<SaveIcon />}
                >
                    Salvar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TemplateModal;
