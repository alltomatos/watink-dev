import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";

interface ButtonWithSpinnerProps extends ButtonProps {
  loading?: boolean;
}

const ButtonWithSpinner = ({ loading = false, children, className, ...rest }: ButtonWithSpinnerProps) => {
  return (
    <Button
      className={cn("relative", className)}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && (
        <Loader2
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-[var(--color-success)]"
          aria-hidden
        />
      )}
      <span className={cn(loading && "invisible")}>{children}</span>
    </Button>
  );
};

export default ButtonWithSpinner;
