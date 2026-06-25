import React from "react";
import { getColorByKey } from "../pipelineCreatorTypes";
import type { StageFormItem } from "../pipelineCreatorTypes";

interface PipelinePreviewProps {
    stages: StageFormItem[];
}

const MOCK_DEALS = [
    { title: "Loja Aurora",    value: 4200,  initials: "LA" },
    { title: "Studio Vértice", value: 1000,  initials: "SV" },
    { title: "Café Norte",     value: 9500,  initials: "CN" },
    { title: "Tech Mendes",    value: 12000, initials: "TM" },
    { title: "Padaria Sol",    value: 2300,  initials: "PS" },
    { title: "Agência Ponto",  value: 3800,  initials: "AP" },
];

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const PipelinePreview: React.FC<PipelinePreviewProps> = ({ stages }) => {
    if (stages.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-6">
                Adicione etapas para ver a prévia.
            </p>
        );
    }

    return (
        <div className="flex gap-3 overflow-x-auto pb-2">
            {stages.map((stage, i) => {
                const color = getColorByKey(stage.colorKey);
                const label = stage.name.trim() || `Etapa ${i + 1}`;
                // distribute mock deals across stages (1–2 per column)
                const deals = MOCK_DEALS.slice(i * 2, i * 2 + 2);
                const count = deals.length;

                return (
                    <div
                        key={i}
                        className="min-w-[172px] max-w-[172px] rounded-xl overflow-hidden flex flex-col flex-shrink-0"
                        style={{ backgroundColor: color.bg }}
                    >
                        {/* Column header */}
                        <div
                            className="flex items-center justify-between px-3 py-2"
                            style={{ backgroundColor: color.color }}
                        >
                            <span className="text-xs font-semibold text-white truncate">{label}</span>
                            <span className="ml-1.5 shrink-0 text-[11px] font-bold text-white/80">
                                {count}
                            </span>
                        </div>

                        {/* Deal cards */}
                        <div className="p-2 flex flex-col gap-1.5">
                            {deals.map((deal, j) => (
                                <div
                                    key={j}
                                    className="rounded-lg bg-white shadow-sm px-2.5 py-2 flex flex-col gap-1"
                                >
                                    <span className="text-xs font-semibold text-foreground leading-tight">
                                        {deal.title}
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] text-muted-foreground">
                                            {fmt(deal.value)}
                                        </span>
                                        <span
                                            className="h-5 w-5 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: color.color }}
                                        >
                                            {deal.initials.charAt(0)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default PipelinePreview;
