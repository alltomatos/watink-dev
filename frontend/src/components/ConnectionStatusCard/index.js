/* @jsxImportSource react */
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

const connectionStatusMeta = {
  DISCONNECTED: { variant: "error", title: "Desconectado" },
  OPENING:      { variant: "info", title: "Iniciando conexão..." },
  QRCODE:       { variant: "warning", title: "Aguardando leitura do QR Code" },
  CONNECTED:    { variant: "success", title: "Dispositivo conectado" },
  TIMEOUT:      { variant: "error", title: "Sessão expirada" },
  default:      { variant: "default", title: "Conectar ao WhatsApp" },
};

const ConnectionStatusCard = ({ status, children }) => {
  const meta = connectionStatusMeta[status] || connectionStatusMeta.default;
  const statusTokenKey = (prop) => `var(--status-${meta.variant}-${prop})`;

  return (
    <Card 
      className="mb-6 rounded-lg text-center shadow-md p-6"
      style={{ backgroundColor: statusTokenKey('bg') }}
    >
      <CardContent className="p-0">
        <h5 
          className="font-semibold mb-2 text-xl" 
          style={{ color: statusTokenKey('text') }}
        >
          {meta.title}
        </h5>
        {children && (
           <p className="text-muted-foreground text-sm pt-2">{children}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatusCard;
