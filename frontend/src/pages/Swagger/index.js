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

    useEffect(() => {
        setUrl(getSwaggerUrl());
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
