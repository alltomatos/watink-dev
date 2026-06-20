import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { WizardFormData } from "../../hooks/usePipelineWizard";

interface WizardStepBasicsProps {
    data: WizardFormData;
    setData: React.Dispatch<React.SetStateAction<WizardFormData>>;
}

const WizardStepBasics: React.FC<WizardStepBasicsProps> = ({ data, setData }) => (
    <div className="flex flex-col gap-4 py-2">
        <div className="flex flex-col gap-1.5">
            <Label htmlFor="pipeline-name">Nome do Pipeline</Label>
            <Input
                id="pipeline-name"
                value={data.name}
                onChange={(e) => setData({ ...data, name: e.target.value })}
                placeholder="Ex: Vendas B2B"
            />
        </div>
        <div className="flex flex-col gap-1.5">
            <Label htmlFor="pipeline-desc">Descrição</Label>
            <Textarea
                id="pipeline-desc"
                value={data.description}
                rows={2}
                onChange={(e) => setData({ ...data, description: e.target.value })}
                placeholder="Descrição opcional do pipeline"
            />
        </div>
        <div className="flex flex-col gap-1.5">
            <Label>Tipo de Visualização</Label>
            <div className="flex gap-4">
                {(["kanban", "funnel"] as const).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="pipeline-type"
                            value={type}
                            checked={data.type === type}
                            onChange={() => setData({ ...data, type })}
                            className="accent-primary"
                        />
                        <span className="text-sm">
                            {type === "kanban" ? "Kanban (Colunas)" : "Funil de Vendas (Lista)"}
                        </span>
                    </label>
                ))}
            </div>
        </div>
    </div>
);

export default WizardStepBasics;
