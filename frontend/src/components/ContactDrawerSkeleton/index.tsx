import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { i18n } from "../../translate/i18n";

const ContactDrawerSkeleton = () => {
  return (
    <div className="flex flex-col bg-[var(--border-default)] px-2 py-2 h-full overflow-y-auto">
      {/* Header card */}
      <div className="border border-[var(--border-divider)] rounded flex flex-col items-center p-4 gap-3 bg-[var(--bg-surface)]">
        <Skeleton className="w-[160px] h-[160px] rounded-full" />
        <Skeleton className="h-6 w-[90px]" />
        <Skeleton className="h-6 w-[80px]" />
        <Skeleton className="h-6 w-[80px]" />
      </div>

      {/* Details card */}
      <div className="mt-2 border border-[var(--border-divider)] rounded p-3 bg-[var(--bg-surface)]">
        <p className="text-sm font-medium mb-2">{i18n.t("contactDrawer.extraInfo")}</p>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mt-1.5 border border-[var(--border-divider)] rounded p-2 flex flex-col gap-1">
            <Skeleton className="h-5 w-[60px]" />
            <Skeleton className="h-5 w-[160px]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ContactDrawerSkeleton;
