import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { PipelineFormData } from "../pipelineCreatorTypes";

interface PipelineFormFieldsProps {
    data: PipelineFormData;
    onChange: (updated: PipelineFormData) => void;
}

const PipelineFormFields: React.FC<PipelineFormFieldsProps> = ({ data, onChange }) => (
    <div className="flex flex-col gap-4">
        <div className="space-y-1.5">
            <Label>Nome do Pipeline</Label>
            <Input
                value={data.name}
                onChange={(e) => onChange({ ...data, name: e.target.value })}
                required
            />
        </div>
        <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
                rows={2}
                value={data.description}
                onChange={(e) => onChange({ ...data, description: e.target.value })}
            />
        </div>
        <div className="space-y-1.5">
            <Label>Tipo de Visualização</Label>
            <div className="flex gap-4">
                {(["kanban", "funnel"] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="pipeline-type"
                            value={type}
                            checked={data.type === type}
                            onChange={() => onChange({ ...data, type })}
                            className="accent-primary"
                        />
                        <span className="text-sm">
                            {type === "kanban" ? "Kanban (Colunas)" : "Funil (Lista)"}
                        </span>
                    </label>
                ))}
            </div>
        </div>
    </div>
);

export default PipelineFormFields;
