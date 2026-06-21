import React from "react";
import { AlertCircle } from "lucide-react";
import { Card, CardContent } from "../../../components/ui/card";
import { i18n } from "../../../translate/i18n";

const ProtocolNotFound: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
    <Card className="w-full max-w-sm text-center shadow-md">
      <CardContent className="pt-8 space-y-3">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
        <p className="text-lg font-bold">
          {i18n.t("publicProtocol.notFound.title")}
        </p>
        <p className="text-sm text-muted-foreground">
          {i18n.t("publicProtocol.notFound.message")}
        </p>
      </CardContent>
    </Card>
  </div>
);

export default ProtocolNotFound;
