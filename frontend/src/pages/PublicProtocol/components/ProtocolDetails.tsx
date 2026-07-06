import React from "react";
import { Badge } from "../../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Separator } from "../../../components/ui/separator";
import { i18n } from "../../../translate/i18n";
import type { Protocol } from "../publicProtocolTypes";

interface ProtocolDetailsProps {
  protocol: Pick<Protocol, "subject" | "description" | "category">;
}

const ProtocolDetails: React.FC<ProtocolDetailsProps> = ({ protocol }) => (
  <Card className="md:col-span-2 shadow-sm">
    <CardHeader className="pb-3">
      <CardTitle className="text-base">
        {i18n.t("publicProtocol.details.title")}
      </CardTitle>
    </CardHeader>
    <Separator />
    <CardContent className="pt-4 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {i18n.t("publicProtocol.details.subject")}
        </p>
        <p className="text-sm font-medium break-words">{protocol.subject}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {i18n.t("publicProtocol.details.description")}
        </p>
        <p className="text-sm whitespace-pre-wrap break-words">
          {protocol.description ||
            i18n.t("publicProtocol.details.noDescription")}
        </p>
      </div>
      {protocol.category && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {i18n.t("publicProtocol.details.category")}
          </p>
          <Badge variant="outline" className="text-xs">
            {protocol.category}
          </Badge>
        </div>
      )}
    </CardContent>
  </Card>
);

export default ProtocolDetails;
