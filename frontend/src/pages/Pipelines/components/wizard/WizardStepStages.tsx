import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardStepStagesProps {
    stages: string[];
    aiTab: string;
    setAiTab: (value: string) => void;
    aiPrompt: string;
    setAiPrompt: (value: string) => void;
    aiLoading: boolean;
    aiEnabled: boolean;
    onStageChange: (index: number, value: string) => void;
    onAddStage: () => void;
    onRemoveStage: (index: number) => void;
    onAiSuggest: () => void;
}

const WizardStepStages: React.FC<WizardStepStagesProps> = ({
    stages,
    aiTab,
    setAiTab,
    aiPrompt,
    setAiPrompt,
    aiLoading,
    aiEnabled,
    onStageChange,
    onAddStage,
    onRemoveStage,
    onAiSuggest,
}) => (
    <Tabs value={aiTab} onValueChange={setAiTab}>
        <TabsList className={cn("w-full", !aiEnabled && "grid-cols-1")}>
            <TabsTrigger value="manual" className="flex-1">
                Manual
            </TabsTrigger>
            {aiEnabled && (
                <TabsTrigger value="ai" className="flex-1 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Assistente de IA
                </TabsTrigger>
            )}
        </TabsList>

        {/* Manual tab */}
        <TabsContent value="manual" className="pt-3">
            <div className="flex flex-col gap-2">
                {stages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-6 text-right shrink-0">
                            {index + 1}.
                        </span>
                        <Input
                            value={stage}
                            onChange={(e) => onStageChange(index, e.target.value)}
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemoveStage(index)}
                            className="shrink-0"
                        >
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
                <Button
                    type="button"
                    variant="outline"
                    className="mt-2 w-fit"
                    onClick={onAddStage}
                >
                    <Plus className="mr-1.5 h-4 w-4" />
                    Adicionar Etapa
                </Button>
            </div>
        </TabsContent>

        {/* AI tab */}
        {aiEnabled && (
            <TabsContent value="ai" className="pt-3">
                <div className="rounded-lg border p-4 flex flex-col gap-3 bg-muted/40">
                    <p className="text-sm text-muted-foreground">
                        Descreva seu processo para a IA sugerir as etapas ideais.
                    </p>
                    <Textarea
                        rows={3}
                        placeholder="Ex: Processo de vendas de carros usados, desde o lead até a entrega."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        disabled={aiLoading}
                    />
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            onClick={onAiSuggest}
                            disabled={aiLoading || !aiPrompt}
                        >
                            {aiLoading ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-1.5 h-4 w-4" />
                                    Gerar Sugestões
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Preview of current stages */}
                <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-1">Etapas Atuais:</p>
                    <div className="flex flex-wrap gap-2">
                        {stages.map((s, i) => (
                            <span key={i} className="bg-border/60 px-2 py-0.5 rounded text-xs">
                                {s}
                            </span>
                        ))}
                    </div>
                </div>
            </TabsContent>
        )}
    </Tabs>
);

export default WizardStepStages;
