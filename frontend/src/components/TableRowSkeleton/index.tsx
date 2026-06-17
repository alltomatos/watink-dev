import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface TableRowSkeletonProps {
  avatar?: boolean;
  columns?: number;
}

const TableRowSkeleton = ({ avatar = false, columns = 3 }: TableRowSkeletonProps) => {
  return (
    <TableRow>
      {avatar && (
        <>
          <TableCell className="p-0">
            <Skeleton className="h-10 w-10 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-[30px] w-20" />
          </TableCell>
        </>
      )}
      {Array.from({ length: columns }, (_, index) => (
        <TableCell align="center" key={index}>
          <div className="flex items-center justify-center">
            <Skeleton className="h-[30px] w-20" />
          </div>
        </TableCell>
      ))}
    </TableRow>
  );
};

export default TableRowSkeleton;
