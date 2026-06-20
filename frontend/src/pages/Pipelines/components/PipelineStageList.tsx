import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStageColor } from "../pipelineCreatorTypes";

interface PipelineStageListProps {
    stages: string[];
    onStageChange: (index: number, value: string) => void;
    onAddStage: () => void;
    onRemoveStage: (index: number) => void;
}

const PipelineStageList: React.FC<PipelineStageListProps> = ({
    stages,
    onStageChange,
    onAddStage,
    onRemoveStage,
}) => (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Etapas ({stages.length})</h3>
            <Button variant="outline" size="sm" onClick={onAddStage}>
                <Plus className="mr-1 h-4 w-4" />
                Adicionar
            </Button>
        </div>

        <div className="flex flex-col gap-2">
            {stages.map((stage, index) => {
                const color = getStageColor(index);
                return (
                    <div
                        key={index}
                        className="flex items-center p-2 rounded-md transition-shadow hover:shadow-md bg-card"
                        style={{
                            backgroundColor: color.bg,
                            borderLeft: `4px solid ${color.border}`,
                            borderTop: `1px solid ${color.border}`,
                            borderRight: `1px solid ${color.border}`,
                            borderBottom: `1px solid ${color.border}`,
                        }}
                    >
                        <div className="w-6 font-semibold shrink-0" style={{ color: color.border }}>
                            {index + 1}.
                        </div>
                        <input
                            className="flex-1 bg-transparent border-none outline-none font-medium px-2 text-sm"
                            style={{ color: color.text }}
                            value={stage}
                            onChange={(e) => onStageChange(index, e.target.value)}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 hover:bg-black/5"
                            onClick={() => onRemoveStage(index)}
                        >
                            <Trash2 className="h-4 w-4" style={{ color: color.border }} />
                        </Button>
                    </div>
                );
            })}
        </div>
    </div>
);

export default PipelineStageList;
