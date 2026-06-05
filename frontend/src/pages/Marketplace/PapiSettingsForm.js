/* @jsxImportSource react */
import React from "react";
import { Typography, Box } from "@material-ui/core";
import PaperCard from "../../components/PaperCard";

const PapiSettingsForm = () => {
  return (
    <PaperCard variant="outlined" padding="default">
      <Box>
        <Typography variant="body1" style={{ fontWeight: 600 }}>
          Configurações PAPI
        </Typography>
        <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
          Módulo de configuração PAPI em reconstrução nesta branch de design.
        </Typography>
      </Box>
    </PaperCard>
  );
};

export default PapiSettingsForm;
