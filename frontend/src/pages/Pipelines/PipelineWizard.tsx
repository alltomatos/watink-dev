import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePipelineWizard, WIZARD_STEPS } from "./hooks/usePipelineWizard";
import StepIndicator from "./components/wizard/StepIndicator";
import WizardStepBasics from "./components/wizard/WizardStepBasics";
import WizardStepStages from "./components/wizard/WizardStepStages";

interface PipelineWizardProps {
    open: boolean;
    onClose: () => void;
}

const PipelineWizard: React.FC<PipelineWizardProps> = ({ open, onClose }) => {
    const {
        activeStep,
        loading,
        data,
        setData,
        aiTab,
        setAiTab,
        aiPrompt,
        setAiPrompt,
        aiLoading,
        aiEnabled,
        handleNext,
        handleBack,
        handleStageChange,
        handleAddStage,
        handleRemoveStage,
        handleAiSuggest,
        isNextDisabled,
    } = usePipelineWizard({ onClose });

    return (
        <Dialog open={open} onOpenChange={loading ? undefined : onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Novo Pipeline</DialogTitle>
                </DialogHeader>

                <StepIndicator steps={WIZARD_STEPS} activeStep={activeStep} />

                {activeStep === 0 && (
                    <WizardStepBasics data={data} setData={setData} />
                )}

                {activeStep === 1 && (
                    <WizardStepStages
                        stages={data.stages}
                        aiTab={aiTab}
                        setAiTab={setAiTab}
                        aiPrompt={aiPrompt}
                        setAiPrompt={setAiPrompt}
                        aiLoading={aiLoading}
                        aiEnabled={aiEnabled}
                        onStageChange={handleStageChange}
                        onAddStage={handleAddStage}
                        onRemoveStage={handleRemoveStage}
                        onAiSuggest={handleAiSuggest}
                    />
                )}

                <DialogFooter className="pt-4 gap-2">
                    <Button
                        variant="outline"
                        disabled={activeStep === 0 || loading}
                        onClick={handleBack}
                    >
                        Voltar
                    </Button>
                    <Button onClick={handleNext} disabled={isNextDisabled}>
                        {activeStep === WIZARD_STEPS.length - 1 ? (
                            loading ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                "Criar Pipeline"
                            )
                        ) : (
                            "Próximo"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PipelineWizard;
