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
        height: "calc(100vh - 100px)",
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

    const profile = (user?.profile || "").toLowerCase();
    const perms = user?.permissions || [];
    const hasSwaggerPermission = profile === "superadmin" || perms.includes("view_swagger") || perms.includes("view:swagger");

    useEffect(() => {
        if (!hasSwaggerPermission) return;

        const targetUrl = getSwaggerUrl();
        const token = JSON.parse(localStorage.getItem("token") || sessionStorage.getItem("token") || "null");
        const withToken = token ? `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}` : targetUrl;
        setUrl(withToken);
    }, [hasSwaggerPermission]);

    if (!hasSwaggerPermission) {
        return (
            <div className={classes.root}>
                <Paper className={classes.paper}>
                    <Typography variant="h6" color="error">
                        Você não tem permissão para visualizar o Swagger.
                    </Typography>
                </Paper>
            </div>
        );
    }

    return (
        <div className={classes.root}>
            <Paper className={classes.paper}>
                <Typography variant="h6">Documentação API (interna)</Typography>
            </Paper>
            <iframe src={url} className={classes.iframe} title="Swagger UI" />
        </div>
    );
};

export default Swagger;
