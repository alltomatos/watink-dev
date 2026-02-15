/* @jsxImportSource react */
import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Button,
  CssBaseline,
  TextField,
  Box,
  Typography,
  Container,
  Paper,
  Grid
} from '@material-ui/core';
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
  },
  paper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(6),
    borderRadius: 20,
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  logo: {
    width: 280,
    marginBottom: theme.spacing(4),
  },
  form: {
    width: "100%",
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
    padding: theme.spacing(1.5),
    borderRadius: 12,
    fontWeight: 'bold',
    fontSize: '1rem',
  },
  title: {
    marginBottom: theme.spacing(3),
    color: "#333",
    fontWeight: 600,
  }
}));

const InitialSetup = () => {
  const classes = useStyles();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    document: ""
  });

  const handleChangeInput = (e) => {
    setSetupData({ ...setupData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!setupData.firstName || !setupData.email || !setupData.password) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/initial-setup", setupData);
      toast.success("Sistema inicializado com sucesso!");
      history.push("/login");
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erro ao inicializar sistema.";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.root}>
      <Container component="main" maxWidth="sm">
        <CssBaseline />
        <Paper className={classes.paper} elevation={0}>
          <img 
            src="/logo.png" 
            alt="Watink Premium" 
            className={classes.logo}
            onError={(e) => { e.target.onerror = null; e.target.src = "https://watink.com/logo.png"; }}
          />
          <Typography component="h1" variant="h5" className={classes.title}>
            Configuração Inicial
          </Typography>
          <form className={classes.form} noValidate onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  variant="outlined"
                  required
                  fullWidth
                  name="firstName"
                  label="Nome"
                  value={setupData.firstName}
                  onChange={handleChangeInput}
                  autoFocus
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  variant="outlined"
                  fullWidth
                  name="lastName"
                  label="Sobrenome"
                  value={setupData.lastName}
                  onChange={handleChangeInput}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  variant="outlined"
                  required
                  fullWidth
                  name="email"
                  label="E-mail (Super Admin)"
                  value={setupData.email}
                  onChange={handleChangeInput}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  variant="outlined"
                  required
                  fullWidth
                  name="password"
                  label="Senha"
                  type="password"
                  value={setupData.password}
                  onChange={handleChangeInput}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  variant="outlined"
                  fullWidth
                  name="document"
                  label="CPF/CNPJ (Opcional)"
                  value={setupData.document}
                  onChange={handleChangeInput}
                />
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              className={classes.submit}
            >
              {loading ? "Inicializando ambiente..." : "Concluir e Iniciar"}
            </Button>
          </form>
        </Paper>
      </Container>
    </div>
  );
};

export default InitialSetup;
