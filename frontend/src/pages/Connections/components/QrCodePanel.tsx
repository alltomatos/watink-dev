import React from "react";
import QRCode from "qrcode.react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface QrCodePanelProps {
  qrcode?: string;
  onCancel: () => void;
}

const QrCodePanel: React.FC<QrCodePanelProps> = ({ qrcode, onCancel }) => (
  <Card>
    <CardContent className="flex flex-col items-center gap-4 p-6">
      <p className="text-sm font-medium">Escaneie o QR Code abaixo com seu celular:</p>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        {qrcode ? (
          <QRCode value={qrcode} size={256} />
        ) : (
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        )}
      </div>
      <Button variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
    </CardContent>
  </Card>
);

export default QrCodePanel;
