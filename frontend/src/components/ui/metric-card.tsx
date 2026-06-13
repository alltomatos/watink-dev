import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { TrendingUp, TrendingDown } from "lucide-react";

import { cn } from "@/lib/utils";

/* ─── Variantes CVA ─────────────────────────────────────────────────── */

const metricCardVariants = cva(
  "wt-metric-card group relative flex items-center gap-4 rounded-xl border bg-card p-5 shadow-card transition-all duration-slow ease-spring select-none hover:-translate-y-1.5 hover:shadow-strong",
  {
    variants: {
      color: {
        primary: "",
        success: "",
        warning: "",
        error: "",
        info: "",
      },
    },
    defaultVariants: {
      color: "primary",
    },
  }
);

/**
 * Mapeamento de cor → gradientes para o container do ícone.
 * Usa as escalas primitivas do DS para garantir contraste e vividez.
 */
const iconContainerStyles: Record<NonNullable<MetricCardColor>, string> = {
  primary:
    "from-[var(--blue-500)] to-[var(--blue-700)] text-white",
  success:
    "from-[var(--emerald-500)] to-[var(--emerald-700)] text-white",
  warning:
    "from-[var(--amber-400)] to-[var(--amber-600)] text-white",
  error:
    "from-[var(--red-500)] to-[var(--red-700)] text-white",
  info:
    "from-[var(--blue-400)] to-[var(--blue-600)] text-white",
};

const trendBadgeStyles = {
  positive: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  negative: "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
} as const;

/* ─── Tipos ─────────────────────────────────────────────────────────── */

type MetricCardColor = "primary" | "success" | "warning" | "error" | "info";

export interface MetricCardTrend {
  /** Texto do indicador de tendência (ex: "+12%", "-3,5%") */
  value: string;
  /** true = tendência positiva (verde), false = negativa (vermelha) */
  positive: boolean;
}

export interface MetricCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof metricCardVariants> {
  /** Label descritivo acima do valor (ex: "Tickets Abertos") */
  label: string;
  /** Valor numérico ou textual em destaque (ex: "1.234", "99%") */
  value: string | number;
  /** Ícone Lucide renderizado dentro do container com gradiente */
  icon: React.ReactNode;
  /** Indicador de tendência (badge de variação) */
  trend?: MetricCardTrend;
}

/* ─── Componente ────────────────────────────────────────────────────── */

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ className, color = "primary", label, value, icon, trend, ...props }, ref) => {
    const resolvedColor = color ?? "primary";

    return (
      <div
        ref={ref}
        className={cn(metricCardVariants({ color }), className)}
        {...props}
      >
        {/* Container do ícone com gradiente */}
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md transition-transform duration-slow ease-spring group-hover:scale-110",
            iconContainerStyles[resolvedColor]
          )}
        >
          {icon}
        </div>

        {/* Conteúdo textual */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-xs font-medium uppercase tracking-caps text-muted-foreground">
            {label}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-tight tracking-tight text-foreground">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold",
                  trend.positive
                    ? trendBadgeStyles.positive
                    : trendBadgeStyles.negative
                )}
              >
                {trend.positive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.value}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);
MetricCard.displayName = "MetricCard";

export { MetricCard, metricCardVariants };
export default MetricCard;
