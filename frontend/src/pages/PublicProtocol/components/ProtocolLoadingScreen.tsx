import React from "react";
import { Loader2 } from "lucide-react";

const ProtocolLoadingScreen: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-muted/10">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

export default ProtocolLoadingScreen;
