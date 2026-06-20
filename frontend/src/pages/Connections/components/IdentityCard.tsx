import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { Avatar } from "../../../components/ui/avatar";
import { getBackendUrl } from "../../../helpers/urlUtils";
import { formatPhone, formatUptime } from "../connectionConfigUtils";
import type { Stats, WhatsApp } from "../connectionConfigTypes";

interface IdentityCardProps {
  whatsapp: WhatsApp;
  isConnected: boolean;
  stats: Stats | null;
}

const IdentityCard: React.FC<IdentityCardProps> = ({ whatsapp, isConnected, stats }) => (
  <Card>
    <CardContent className="flex flex-col items-center gap-4 p-8">
      <div className="relative">
        <Avatar
          size="xl"
          className="h-20 w-20"
          src={whatsapp.profilePicUrl ? getBackendUrl(whatsapp.profilePicUrl) : undefined}
          name={whatsapp.name}
        />
        {isConnected && (
          <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-green-500">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </span>
        )}
      </div>
      <div className="text-center">
        <p className="text-2xl font-semibold tracking-tight">
          {formatPhone(whatsapp.number) || "Número não disponível"}
        </p>
        {isConnected && whatsapp.lastConnectedAt && (
          <p className="mt-1 text-sm text-muted-foreground">
            Conectado há {formatUptime(whatsapp.lastConnectedAt)} · sincronizado
          </p>
        )}
      </div>

      <div className="mt-2 grid w-full max-w-md grid-cols-3 gap-3">
        <div className="rounded-xl bg-muted/50 p-4 text-center">
          <p className="text-2xl font-bold">{stats ? stats.messagesToday : "—"}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mensagens hoje</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-4 text-center">
          <p className="text-2xl font-bold">{stats ? stats.tickets : "—"}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tickets</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-4 text-center">
          <p className="text-2xl font-bold">{stats && stats.latencyMs >= 0 ? `${stats.latencyMs}ms` : "—"}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Latência</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default IdentityCard;
