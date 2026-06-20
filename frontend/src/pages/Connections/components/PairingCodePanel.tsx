import React from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";

interface PairingCodePanelProps {
  pairingCode: string;
  onCancel: () => void;
}

const PairingCodePanel: React.FC<PairingCodePanelProps> = ({ pairingCode, onCancel }) => (
  <Card>
    <CardContent className="flex flex-col items-center gap-4 p-6">
      {!pairingCode ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Solicitando código de pareamento...</p>
        </>
      ) : (
        <div className="text-center">
          <h4 className="font-mono text-3xl font-bold tracking-[0.5em]">{pairingCode}</h4>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Insira este código no WhatsApp: Configurações → Dispositivos Conectados → Vincular Dispositivo → Vincular
            com código.
          </p>
        </div>
      )}
      <Button variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
    </CardContent>
  </Card>
);

export default PairingCodePanel;
