import React from "react";
import { LayoutGrid, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { PipelineFormData } from "../pipelineCreatorTypes";

interface PipelineFormFieldsProps {
    data: PipelineFormData;
    onChange: (updated: PipelineFormData) => void;
}

const TYPE_OPTIONS = [
    {
        value: "kanban" as const,
        label: "Kanban (Colunas)",
        description: "Arraste os negócios entre colunas coloridas por estágio.",
        Icon: LayoutGrid,
    },
    {
        value: "funnel" as const,
        label: "Funil (Lista)",
        description: "Visão em lista priorizada por etapa do funil.",
        Icon: Filter,
    },
];

const PipelineFormFields: React.FC<PipelineFormFieldsProps> = ({ data, onChange }) => (
    <div className="flex flex-col gap-5">
        <div className="space-y-1.5">
            <Label htmlFor="pipeline-name">Nome do Pipeline</Label>
            <Input
                id="pipeline-name"
                value={data.name}
                onChange={(e) => onChange({ ...data, name: e.target.value })}
                placeholder="Ex: Funil de Vendas — Comercial"
                required
            />
        </div>

        <div className="space-y-1.5">
            <Label htmlFor="pipeline-desc">
                Descrição{" "}
                <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
                id="pipeline-desc"
                rows={3}
                value={data.description}
                onChange={(e) => onChange({ ...data, description: e.target.value })}
                placeholder="Acompanhamento de negócios do primeiro contato ao fechamento."
                className="resize-none"
            />
        </div>

        <div className="space-y-2">
            <Label>Tipo de Visualização</Label>
            <div className="grid grid-cols-2 gap-3">
                {TYPE_OPTIONS.map(({ value, label, description, Icon }) => {
                    const selected = data.type === value;
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onChange({ ...data, type: value })}
                            className={cn(
                                "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                                selected
                                    ? "border-primary bg-primary/5"
                                    : "border-border bg-background hover:border-primary/40"
                            )}
                        >
                            <div
                                className={cn(
                                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                    selected
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={cn(
                                            "text-sm font-semibold leading-tight",
                                            selected ? "text-primary" : "text-foreground"
                                        )}
                                    >
                                        {label}
                                    </span>
                                    <span
                                        className={cn(
                                            "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center",
                                            selected
                                                ? "border-primary"
                                                : "border-muted-foreground/40"
                                        )}
                                    >
                                        {selected && (
                                            <span className="h-2 w-2 rounded-full bg-primary block" />
                                        )}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground leading-snug">
                                    {description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
);

export default PipelineFormFields;
