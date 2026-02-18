/* @jsxImportSource react */
import React from "react";
import { Paper, Typography, Box } from "@material-ui/core";

const PapiSettingsForm = () => {
  return (
    <Paper style={{ padding: 16 }}>
      <Box>
        <Typography variant="body1" style={{ fontWeight: 600 }}>
          Configurações PAPI
        </Typography>
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          Módulo de configuração PAPI em reconstrução nesta branch de design.
        </Typography>
      </Box>
    </Paper>
  );
};

export default PapiSettingsForm;
