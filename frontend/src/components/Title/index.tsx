import React from "react";
import { cn } from "@/lib/utils";

interface TitleProps {
  children: React.ReactNode;
  className?: string;
}

export default function Title({ children, className }: TitleProps) {
  return (
    <h2
      className={cn(
        "text-xl font-semibold text-[var(--primary)] mb-2 leading-snug",
        className
      )}
    >
      {children}
    </h2>
  );
}
