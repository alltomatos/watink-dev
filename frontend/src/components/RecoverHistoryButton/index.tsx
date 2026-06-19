import React, { useState } from "react";
import { History } from "lucide-react";
import { toast } from "react-toastify";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";

interface RecoverHistoryButtonProps {
  ticketId: number;
}

const RANGE_OPTIONS: Array<{ range: string; labelKey: string }> = [
  { range: "1d", labelKey: "recoverHistory.ranges.oneDay" },
  { range: "2d", labelKey: "recoverHistory.ranges.twoDays" },
  { range: "7d", labelKey: "recoverHistory.ranges.oneWeek" },
  { range: "30d", labelKey: "recoverHistory.ranges.oneMonth" },
  { range: "all", labelKey: "recoverHistory.ranges.all" },
];

const RecoverHistoryButton: React.FC<RecoverHistoryButtonProps> = ({
  ticketId,
}) => {
  const [loading, setLoading] = useState(false);

  const handleRecover = async (range: string) => {
    setLoading(true);
    try {
      await api.post(`/tickets/${ticketId}/history/recover`, { range });
      toast.success(i18n.t("recoverHistory.requested") as string);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          className="gap-1"
          aria-label={i18n.t("recoverHistory.button") as string}
        >
          <History className="h-4 w-4" />
          {i18n.t("recoverHistory.button") as string}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {i18n.t("recoverHistory.title") as string}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {RANGE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.range}
            onClick={() => handleRecover(opt.range)}
          >
            {i18n.t(opt.labelKey) as string}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RecoverHistoryButton;
