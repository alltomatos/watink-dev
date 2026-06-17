import React, { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

type StatusVariant = "error" | "info" | "warning" | "success" | "default";

interface StatusMeta {
  variant: StatusVariant;
  title: string;
}

const CONNECTION_STATUS_META: Record<string, StatusMeta> = {
  DISCONNECTED: { variant: "error",   title: "Desconectado" },
  OPENING:      { variant: "info",    title: "Iniciando conexão..." },
  QRCODE:       { variant: "warning", title: "Aguardando leitura do QR Code" },
  CONNECTED:    { variant: "success", title: "Dispositivo conectado" },
  TIMEOUT:      { variant: "error",   title: "Sessão expirada" },
  default:      { variant: "default", title: "Conectar ao WhatsApp" },
};

interface ConnectionStatusCardProps {
  status?: string;
  children?: ReactNode;
}

const ConnectionStatusCard: React.FC<ConnectionStatusCardProps> = ({
  status,
  children,
}) => {
  const meta =
    (status && CONNECTION_STATUS_META[status]) ||
    CONNECTION_STATUS_META.default;

  const tokenVar = (prop: string) =>
    `var(--status-${meta.variant}-${prop})`;

  return (
    <Card
      className="mb-6 rounded-lg p-6 text-center shadow-md"
      style={{ backgroundColor: tokenVar("bg") }}
    >
      <CardContent className="p-0">
        <h5
          className="mb-2 text-xl font-semibold"
          style={{ color: tokenVar("text") }}
        >
          {meta.title}
        </h5>
        {children && (
          <p className="pt-2 text-sm text-muted-foreground">{children}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionStatusCard;
