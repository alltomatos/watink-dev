import React from "react";
import { Hash, MessageSquare, Calendar, ShieldCheck, Star, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import DetailItem from "./DetailItem";
import { formatPhone } from "../connectionConfigUtils";
import type { WhatsApp } from "../connectionConfigTypes";

interface SessionDetailsCardProps {
  whatsapp: WhatsApp;
  status: string;
  keepAliveSaving: boolean;
  onToggleKeepAlive: (next: boolean) => Promise<void>;
}

const SessionDetailsCard: React.FC<SessionDetailsCardProps> = ({
  whatsapp,
  status,
  keepAliveSaving,
  onToggleKeepAlive,
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Detalhes da Sessão
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DetailItem icon={<Hash className="h-4 w-4" />} label="Nome da Sessão" value={whatsapp.name} />
        <DetailItem
          icon={<MessageSquare className="h-4 w-4" />}
          label="Número Conectado"
          value={formatPhone(whatsapp.number) || "—"}
        />
        <DetailItem
          icon={<Calendar className="h-4 w-4" />}
          label="Data da 1ª Conexão"
          value={
            whatsapp.firstConnection
              ? new Date(whatsapp.firstConnection).toLocaleDateString()
              : whatsapp.createdAt
              ? new Date(whatsapp.createdAt).toLocaleDateString()
              : "—"
          }
        />
        <DetailItem icon={<ShieldCheck className="h-4 w-4" />} label="Status Oficial" value={status} />
        <DetailItem icon={<Star className="h-4 w-4" />} label="Padrão" value={whatsapp.isDefault ? "Sim" : "Não"} />
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground">Reconexão Automática</p>
            <div className="mt-1 flex items-center gap-2">
              <Switch
                checked={!!whatsapp.keepAlive}
                disabled={keepAliveSaving}
                onCheckedChange={onToggleKeepAlive}
              />
              <span className="text-sm">{whatsapp.keepAlive ? "Ativado" : "Desativado"}</span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default SessionDetailsCard;
