import React from "react";
import { format } from "date-fns";
import { ClipboardList, AlertCircle } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent } from "../../../components/ui/card";
import { i18n } from "../../../translate/i18n";
import type { Protocol } from "../publicProtocolTypes";

const statusVariant = (
  status: string
): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "open") return "default";
  if (status === "in_progress") return "secondary";
  if (status === "resolved") return "outline";
  return "outline";
};

const priorityVariant = (
  priority: string
): "default" | "secondary" | "destructive" | "outline" => {
  if (priority === "high" || priority === "urgent") return "destructive";
  if (priority === "medium") return "secondary";
  return "outline";
};

interface ProtocolHeaderProps {
  protocol: Pick<Protocol, "protocolNumber" | "status" | "priority" | "createdAt">;
}

const ProtocolHeader: React.FC<ProtocolHeaderProps> = ({ protocol }) => (
  <Card className="shadow-sm">
    <CardContent className="pt-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold break-words">
              {i18n.t("publicProtocol.header.number", {
                number: protocol.protocolNumber,
              })}
            </h1>
            <p className="text-sm text-muted-foreground">
              {i18n.t("publicProtocol.header.createdAt", {
                date: format(
                  new Date(protocol.createdAt),
                  "dd/MM/yyyy 'às' HH:mm"
                ),
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge variant={statusVariant(protocol.status)}>
            {i18n.t(`publicProtocol.status.${protocol.status}`)}
          </Badge>
          <Badge variant={priorityVariant(protocol.priority)}>
            <AlertCircle className="mr-1 h-3 w-3" />
            {i18n.t(`publicProtocol.priority.${protocol.priority}`)}
          </Badge>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default ProtocolHeader;
