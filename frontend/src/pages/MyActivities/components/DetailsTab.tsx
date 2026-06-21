import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Activity } from "../activityTypes";

interface DetailsTabProps {
  activity: Activity;
}

const DetailsTab: React.FC<DetailsTabProps> = ({ activity }) => (
  <TabsContent value="details" className="space-y-3">
    <div className="rounded-lg border border-border p-4 space-y-3">
      <h3 className="text-base font-semibold">Detalhes da Atividade</h3>
      {activity.description && (
        <p className="text-sm text-muted-foreground">{activity.description}</p>
      )}
      <hr className="border-border" />
      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">Protocolo: #{activity.protocolId ?? "—"}</p>
        <p className="text-muted-foreground">
          Cliente: {activity.protocol?.client?.name ?? "N/A"}
        </p>
      </div>
    </div>
  </TabsContent>
);

export default DetailsTab;
