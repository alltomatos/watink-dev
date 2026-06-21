import React from "react";
import { RefreshCw } from "lucide-react";

interface ConnectionIconProps {
  warn: boolean;
}

const ConnectionIcon: React.FC<ConnectionIconProps> = ({ warn }) => (
  <span className="relative inline-flex">
    <RefreshCw />
    {warn && (
      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
        !
      </span>
    )}
  </span>
);

export default ConnectionIcon;
