import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

const TicketsListSkeleton = () => {
  return (
    <div className="px-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex gap-3 items-center p-3 mb-2 rounded-xl border"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <Skeleton className="h-11 w-11 rounded-[10px] shrink-0" />
          <div className="flex-1 flex flex-col gap-2 justify-center">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-[40%]" />
              <Skeleton className="h-3.5 w-[15%]" />
            </div>
            <Skeleton className="h-3.5 w-[70%]" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default TicketsListSkeleton;
