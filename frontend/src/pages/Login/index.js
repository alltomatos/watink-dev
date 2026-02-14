import React, { useState, useEffect, useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  Avatar,
  Button,
  CssBaseline,
  TextField,
  Grid,
  Box,
  Typography,
  Container,
  InputAdornment,
  IconButton,
  Link,
  Checkbox,
  FormControlLabel
} from '@material-ui/core';

import { LockOutlined, Visibility, VisibilityOff } from '@material-ui/icons';
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import { getBackendUrl } from "../../helpers/urlUtils";

const useStyles = makeStyles((theme) => ({
  root: {
    minHeight: "100vh",
    display: "flex",
    overflow: "hidden",
    position: "relative",
    backgroundColor: theme.palette.background.default,
  },
  paper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  formContainer: {
    backgroundColor: theme.palette.type === "dark" ? "rgba(30, 41, 59, 0.7)" : "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(12px)",
    padding: theme.spacing(6),
    borderRadius: 24,
    boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
    border: `1px solid ${theme.palette.divider}`,
    width: "100%",
    maxWidth: 450,
  },
  avatar: {
    margin: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    width: 56,
    height: 56,
  },
  form: {
    width: "100%",
    marginTop: theme.spacing(1),
  },
  submit: {
    margin: theme.spacing(3, 0, 2),
    height: 48,
    borderRadius: 12,
    fontSize: "1rem",
    fontWeight: 600,
  },
  backgroundWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: theme.palette.type === "dark" 
      ? "linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.3))"
      : "linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.2))",
    zIndex: 2,
  },
  splitFormSide: {
    flex: "0 0 550px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing(0, 4),
    backgroundColor: theme.palette.background.paper,
    zIndex: 10,
    boxShadow: "0 0 40px rgba(0,0,0,0.1)",
    [theme.breakpoints.down("sm")]: {
      flex: 1,
      width: "100%",
    }
  },
  splitImageSide: {
    flex: 1,
    position: "relative",
    backgroundSize: "cover",
    backgroundPosition: "center",
    [theme.breakpoints.down("sm")]: {
      display: "none",
    }
  }
}));

const Login = () => {
  const classes = useStyles();

  const [user, setUser] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("rememberedEmail") !== null;
  });
  const [settings, setSettings] = useState({
    loginLayout: "split_left", // split_left, split_right, centered
    loginBackground: "", // url
    systemLogo: "",
  });

  const { handleLogin } = useContext(AuthContext);

  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setUser(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/public-settings");
        const settingsData = Array.isArray(data) ? data : [];

        const layoutSetting = settingsData.find(s => s.key === "login_layout");
        const bgSetting = settingsData.find(s => s.key === "login_backgroundImage");
        const logoSetting = settingsData.find(s => s.key === "systemLogo");
        const userCreationSetting = settingsData.find(s => s.key === "userCreation");

        setSettings({
          loginLayout: layoutSetting?.value || "split_left",
          loginBackground: bgSetting?.value ? getBackendUrl(bgSetting.value) : "/login-background.png",
          systemLogo: logoSetting?.value ? getBackendUrl(logoSetting.value) : "/logo.png",
          userCreation: userCreationSetting?.value || "enabled",
        });
      } catch (err) {
        console.error("Error fetching settings for login", err);
      }
    };
    fetchSettings();
  }, []);

  const handleChangeInput = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handlSubmit = (e) => {
    e.preventDefault();
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", user.email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }
    handleLogin(user, rememberMe);
  };

  const renderLoginForm = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={classes.paper}
    >
      {settings.systemLogo && (
        <img
          src={settings.systemLogo}
          alt="Logo"
          style={{ maxWidth: 220, marginBottom: 40 }}
          onError={(e) => { e.target.onerror = null; e.target.src = "/logo.png"; }}
        />
      )}
      {!settings.systemLogo && (
        <Avatar className={classes.avatar}>
          <LockOutlined style={{ fontSize: 32 }} />
        </Avatar>
      )}
      
      <Typography component="h1" variant="h4" style={{ fontWeight: 700, marginBottom: 8, color: "inherit" }}>
        {i18n.t("login.title")}
      </Typography>
      <Typography variant="body2" style={{ marginBottom: 32, opacity: 0.7 }}>
        Bem-vindo de volta! Por favor, insira seus dados.
      </Typography>

      <form className={classes.form} noValidate onSubmit={handlSubmit}>
        <TextField
          variant="outlined"
          margin="normal"
          required
          fullWidth
          id="email"
          label={i18n.t("login.form.email")}
          name="email"
          value={user.email}
          onChange={handleChangeInput}
          autoComplete="email"
          autoFocus
        />
        <TextField
          variant="outlined"
          margin="normal"
          required
          fullWidth
          name="password"
          label={i18n.t("login.form.password")}
          id="password"
          value={user.password}
          onChange={handleChangeInput}
          autoComplete="current-password"
          type={showPassword ? 'text' : 'password'}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={i18n.t("login.form.passwordVisibility")}
                  onClick={() => setShowPassword((e) => !e)}
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <Grid container alignItems="center" style={{ marginTop: 8 }}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  name="rememberMe"
                  color="primary"
                />
              }
              label={i18n.t("login.form.rememberMe")}
            />
          </Grid>
        </Grid>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          color="primary"
          className={classes.submit}
          component={motion.button}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {i18n.t("login.buttons.submit")}
        </Button>
        <Grid container justifyContent="center" style={{ marginTop: 16 }}>
          <Grid item>
            {settings.userCreation === "enabled" && (
              <Typography variant="body2">
                Ainda não tem uma conta?{" "}
                <Link
                  component={RouterLink}
                  to="/signup"
                  style={{ fontWeight: 600, color: "inherit" }}
                >
                  {i18n.t("login.buttons.register")}
                </Link>
              </Typography>
            )}
          </Grid>
        </Grid>
      </form>
    </motion.div>
  );

  if (settings.loginLayout === "centered") {
    return (
      <Box className={classes.root} style={{ alignItems: "center", justifyContent: "center" }}>
        <CssBaseline />
        <div 
          className={classes.backgroundWrapper} 
          style={{ 
            backgroundImage: settings.loginBackground ? `url(${settings.loginBackground})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }} 
        />
        <div className={classes.overlay} style={{ background: "radial-gradient(circle, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%)" }} />
        
        <Container component="main" maxWidth="xs" style={{ zIndex: 10 }}>
          <div className={classes.formContainer}>
            {renderLoginForm()}
          </div>
        </Container>
      </Box>
    );
  }

  const isRightForm = settings.loginLayout === "split_right";

  return (
    <Box className={classes.root}>
      <CssBaseline />
      <AnimatePresence>
        {!isRightForm ? (
          <>
            <motion.div 
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              className={classes.splitFormSide}
            >
              <div style={{ width: "100%", maxWidth: 400 }}>
                {renderLoginForm()}
              </div>
            </motion.div>
            <div 
              className={classes.splitImageSide}
              style={{ backgroundImage: settings.loginBackground ? `url(${settings.loginBackground})` : "none" }}
            >
              <div className={classes.overlay} style={{ background: "linear-gradient(to left, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)" }} />
            </div>
          </>
        ) : (
          <>
            <div 
              className={classes.splitImageSide}
              style={{ backgroundImage: settings.loginBackground ? `url(${settings.loginBackground})` : "none" }}
            >
               <div className={classes.overlay} style={{ background: "linear-gradient(to right, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 100%)" }} />
            </div>
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className={classes.splitFormSide}
            >
              <div style={{ width: "100%", maxWidth: 400 }}>
                {renderLoginForm()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default Login;
