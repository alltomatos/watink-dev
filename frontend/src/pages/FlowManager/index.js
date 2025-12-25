import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { makeStyles } from '@material-ui/core/styles';
import {
    Paper,
    Button,
    Grid,
    Typography,
    Card,
    CardContent,
    CardActions,
    IconButton,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@material-ui/core';
import { Add, Edit, Delete, PlayArrow } from '@material-ui/icons';
import { toast } from 'react-toastify';
import api from '../../services/api';
import MainContainer from '../../components/MainContainer';
import MainHeader from '../../components/MainHeader';
import MainHeaderButtonsWrapper from '../../components/MainHeaderButtonsWrapper';
import Title from '../../components/Title';

const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: theme.spacing(2),
    },
    card: {
        minWidth: 275,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%'
    },
    cardContent: {
        flexGrow: 1
    },
    createNewButton: {
        width: '100%',
        height: '100%',
        minHeight: 150,
        border: '2px dashed #ccc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: '#f5f5f5',
            borderColor: theme.palette.primary.main
        }
    }
}));

const FlowManager = () => {
    const classes = useStyles();
    const history = useHistory();
    const [flows, setFlows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [newFlowName, setNewFlowName] = useState('');

    useEffect(() => {
        fetchFlows();
    }, []);

    const fetchFlows = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/flows');
            setFlows(data);
        } catch (err) {
            toast.error("Erro ao carregar fluxos");
        }
        setLoading(false);
    };

    const handleCreateFlow = async () => {
        if (!newFlowName) return;
        try {
            const { data } = await api.post('/flows', {
                name: newFlowName,
                nodes: [{ id: '1', position: { x: 250, y: 50 }, data: { label: 'Início do Fluxo' }, type: 'input' }],
                edges: []
            });
            toast.success("Fluxo criado com sucesso!");
            setOpenModal(false);
            setNewFlowName('');
            history.push(`/flowbuilder/${data.id}`);
        } catch (err) {
            toast.error("Erro ao criar fluxo");
        }
    };

    const handleEditFlow = (id) => {
        history.push(`/flowbuilder/${id}`);
    };

    return (
        <MainContainer>
            <MainHeader>
                <Title>Gerenciador de Fluxos</Title>
                <MainHeaderButtonsWrapper>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<Add />}
                        onClick={() => setOpenModal(true)}
                    >
                        Novo Fluxo
                    </Button>
                </MainHeaderButtonsWrapper>
            </MainHeader>

            <Grid container spacing={3}>
                {flows.map((flow) => (
                    <Grid item xs={12} sm={6} md={4} key={flow.id}>
                        <Card className={classes.card}>
                            <CardContent className={classes.cardContent}>
                                <Typography variant="h5" component="h2">
                                    {flow.name}
                                </Typography>
                                <Typography color="textSecondary">
                                    Status: {flow.isActive ? 'Ativo' : 'Inativo'}
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button size="small" color="primary" onClick={() => handleEditFlow(flow.id)} startIcon={<Edit />}>
                                    Editar
                                </Button>
                                {/* Add Delete button later */}
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={openModal} onClose={() => setOpenModal(false)} aria-labelledby="form-dialog-title">
                <DialogTitle id="form-dialog-title">Novo Fluxo</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Nome do Fluxo"
                        type="text"
                        fullWidth
                        value={newFlowName}
                        onChange={(e) => setNewFlowName(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)} color="primary">
                        Cancelar
                    </Button>
                    <Button onClick={handleCreateFlow} color="primary">
                        Criar
                    </Button>
                </DialogActions>
            </Dialog>
        </MainContainer>
    );
};

export default FlowManager;
