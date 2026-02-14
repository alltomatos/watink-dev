import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { makeStyles } from "@material-ui/core/styles";
import { CircularProgress, Typography } from "@material-ui/core";
import logo from "../../assets/logo.png";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  logoWrapper: {
    width: "120px",
    height: "120px",
    marginBottom: theme.spacing(4),
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  logoImg: {
    width: "100%",
    height: "auto",
    zIndex: 2,
  },
  logoPlaceholder: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  loader: {
    marginBottom: theme.spacing(2),
    color: "#2563eb",
  },
  text: {
    fontWeight: 600,
    color: "#1e293b",
    fontFamily: "'Inter', sans-serif",
  },
}));

// Inline SVG Logo for instant visibility
const LogoSVG = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="24" fill="#2563EB"/>
    <path d="M30 35H40L50 55L60 35H70L55 75H45L30 35Z" fill="white"/>
  </svg>
);

const SplashScreen = () => {
  const classes = useStyles();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className={classes.container}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}
      >
        <div className={classes.logoWrapper}>
          {!imgLoaded && (
            <div className={classes.logoPlaceholder}>
               <LogoSVG />
            </div>
          )}
          <img 
            src={logo} 
            alt="Logo" 
            className={classes.logoImg} 
            onLoad={() => setImgLoaded(true)}
            style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
        </div>
        
        <div className={classes.loader}>
          <CircularProgress size={40} thickness={4} color="inherit" />
        </div>

        <Typography variant="body1" className={classes.text}>
          Carregando ecossistema...
        </Typography>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
