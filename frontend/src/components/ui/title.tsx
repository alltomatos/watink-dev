import React from "react";
import { cn } from "@/lib/utils";

type TitleProps = React.HTMLAttributes<HTMLHeadingElement>;

export const Title = ({ className, children, ...props }: TitleProps) => {
  return (
    <h2
      className={cn("text-lg font-semibold text-primary mb-4", className)}
      {...props}
    >
      {children}
    </h2>
  );
};
