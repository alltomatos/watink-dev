import React from "react";
import { CheckCircle2, WifiOff, QrCode, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { STATUS_LABELS } from "../connectionsTypes";

interface ConnectionStatusBadgeProps {
  status: string;
}

export const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({ status }) => {
  const label = STATUS_LABELS[status] ?? "Desconhecido";

  if (status === "BANNED") {
    return (
      <Badge variant="destructive" className="bg-red-600 hover:bg-red-600">
        <Ban size={12} className="mr-1" />
        {label}
      </Badge>
    );
  }

  if (status === "CONNECTED") {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
        <CheckCircle2 size={12} className="mr-1" />
        {label}
      </Badge>
    );
  }

  if (status === "DISCONNECTED" || status === "TIMEOUT") {
    return (
      <Badge variant="destructive">
        <WifiOff size={12} className="mr-1" />
        {label}
      </Badge>
    );
  }

  if (status === "QRCODE") {
    return (
      <Badge variant="outline" className="border-amber-400 text-amber-600">
        <QrCode size={12} className="mr-1" />
        {label}
      </Badge>
    );
  }

  // PAIRING / OPENING and other transient states
  return (
    <Badge variant="outline" className="animate-pulse">
      {label}
    </Badge>
  );
};
