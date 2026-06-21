import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const InsightsSkeleton = () => (
  <div className="h-full flex flex-col overflow-hidden bg-[var(--bg-default)]">
    <div className="flex items-center justify-center flex-1">
      <Skeleton className="w-10 h-10 rounded-full" />
    </div>
  </div>
);

export default InsightsSkeleton;
