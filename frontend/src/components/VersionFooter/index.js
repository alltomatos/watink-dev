import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import { makeStyles, Typography, Collapse } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    footer: {
        padding: theme.spacing(2),
        textAlign: "center",
        color: theme.palette.text.secondary,
        borderTop: "1px solid rgba(0, 0, 0, 0.12)",
        marginTop: "auto",
        fontSize: "0.75rem",
        overflow: "hidden",
        whiteSpace: "nowrap",
    },
}));

const VersionFooter = ({ collapsed = false }) => {
    const classes = useStyles();
    const [backendVersion, setBackendVersion] = useState("-");
    const [engineVersion, setEngineVersion] = useState("-");
    const frontendVersion = process.env.npm_package_version || "0.1.0";

    useEffect(() => {
        const fetchVersion = async () => {
            try {
                const { data } = await api.get("/version");
                setBackendVersion(data.version);
                setEngineVersion(data.engineVersion);
            } catch (err) {
                console.error("Failed to fetch backend version", err);
            }
        };
        fetchVersion();
    }, []);

    // Esconder footer quando drawer está colapsado
    if (collapsed) {
        return null;
    }

    return (
        <div className={classes.footer}>
            <Typography variant="caption" display="block">
                Front: v{frontendVersion} | Back: v{backendVersion}
            </Typography>
            <Typography variant="caption" display="block">
                Engine: v{engineVersion}
            </Typography>
        </div>
    );
};

export default VersionFooter;

