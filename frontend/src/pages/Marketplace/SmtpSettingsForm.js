/* @jsxImportSource react */
import React from "react";
import { Paper, Typography, Box } from "@material-ui/core";

const SmtpSettingsForm = () => {
  return (
    <Paper style={{ padding: 16 }}>
      <Box>
        <Typography variant="body1" style={{ fontWeight: 600 }}>
          Configurações SMTP
        </Typography>
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          Módulo de configuração SMTP em reconstrução nesta branch de design.
        </Typography>
      </Box>
    </Paper>
  );
};

export default SmtpSettingsForm;
