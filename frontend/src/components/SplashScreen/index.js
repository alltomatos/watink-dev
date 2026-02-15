/* @jsxImportSource react */
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import CircularProgress from "@material-ui/core/CircularProgress";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    width: "100vw",
    backgroundColor: theme.palette.type === "dark" ? "#111B21" : "#f0f2f5",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  logo: {
    width: 250,
    marginBottom: 20,
    animation: "$pulse 2s infinite ease-in-out",
  },
  progress: {
    color: theme.palette.primary.main,
  },
  text: {
    marginTop: 15,
    color: "#888",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  "@keyframes pulse": {
    "0%": {
      transform: "scale(1)",
      opacity: 0.8,
    },
    "50%": {
      transform: "scale(1.05)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(1)",
      opacity: 0.8,
    },
  },
}));

const SplashScreen = () => {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <img 
        src="/logo.png" 
        alt="Watink" 
        className={classes.logo} 
        onError={(e) => { e.target.onerror = null; e.target.src = "https://watink.com/logo.png"; }}
      />
      <CircularProgress className={classes.progress} size={40} thickness={4} />
      <div className={classes.text}>Iniciando ambiente...</div>
    </div>
  );
};

export default SplashScreen;
