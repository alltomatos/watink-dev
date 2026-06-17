import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const TicketHeaderSkeleton: React.FC = () => (
  <Card className="flex flex-none rounded-none border-b border-border bg-muted p-4">
    <div className="flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  </Card>
);

export default TicketHeaderSkeleton;
