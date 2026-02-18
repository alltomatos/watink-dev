/* @jsxImportSource react */
import React, { useState, useEffect, useContext } from "react";
import { getSwaggerUrl } from "../../config";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import { AuthContext } from "../../context/Auth/AuthContext";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 100px)", // Adjust for header
        padding: theme.spacing(2),
    },
    paper: {
        padding: theme.spacing(2),
        display: "flex",
        alignItems: "center",
        marginBottom: 12,
    },
    iframe: {
        width: "100%",
        height: "100%",
        border: "none",
    },
}));

const Swagger = () => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const resolveSwagger = async () => {
            const targetUrl = getSwaggerUrl();
            setUrl(targetUrl);

            try {
                const res = await fetch(targetUrl, { credentials: "include" });
                const text = await res.text();

                const looksLikeAppShell =
                    text.includes("<title>Watink") ||
                    text.includes("id=\"root\"") ||
                    text.includes("build/assets");

                if (!res.ok || looksLikeAppShell) {
                    setError("Swagger não publicado no backend. Endpoint esperado: /api/docs");
                }
            } catch (e) {
                setError("Falha ao carregar Swagger do backend.");
            }
        };

        resolveSwagger();
    }, []);

    const hasSwaggerPermission = (user?.permissions || []).includes("view_swagger");

    if (!hasSwaggerPermission) {
        return (
            <div className={classes.root}>
                <Paper className={classes.paper}>
                    <Typography variant="h6" color="error">
                        Você não tem permissão para visualizar esta página.
                    </Typography>
                </Paper>
            </div>
        );
    }

    if (error) {
        return (
            <div className={classes.root}>
                <Paper className={classes.paper}>
                    <Typography variant="h6" color="error">{error}</Typography>
                </Paper>
            </div>
        );
    }

    return (
        <div className={classes.root}>
            <Paper className={classes.paper}>
                <h2>Documentação API</h2>
            </Paper>
            <iframe src={url} className={classes.iframe} title="Swagger UI" />
        </div>
    );
};

export default Swagger;
