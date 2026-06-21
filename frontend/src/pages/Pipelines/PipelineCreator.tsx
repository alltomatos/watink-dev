import React from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import MainContainer from "@/components/MainContainer";
import MainHeader from "@/components/MainHeader";
import Title from "@/components/Title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { usePipelineCreator } from "./hooks/usePipelineCreator";
import PipelineFormFields from "./components/PipelineFormFields";
import PipelineStageList from "./components/PipelineStageList";
import PipelineAIChat from "./components/PipelineAIChat";

const PipelineCreator: React.FC = () => {
    const {
        pipelineId,
        data,
        setData,
        loading,
        aiEnabled,
        messages,
        input,
        setInput,
        aiLoading,
        messagesEndRef,
        handleSave,
        handleStageChange,
        handleAddStage,
        handleRemoveStage,
        handleSendMessage,
        handleKeyDown,
        navigate,
    } = usePipelineCreator();

    return (
        <MainContainer>
            <MainHeader>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/pipelines")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Title>{pipelineId ? "Editar Pipeline" : "Novo Pipeline"}</Title>
                </div>
            </MainHeader>

            <div className="flex flex-1 overflow-hidden gap-4 p-4">
                <Card className="flex-[2] overflow-y-auto p-6 flex flex-col gap-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Definições</h3>
                        <PipelineFormFields data={data} onChange={setData} />
                    </div>

                    <Separator />

                    <PipelineStageList
                        stages={data.stages}
                        onStageChange={handleStageChange}
                        onAddStage={handleAddStage}
                        onRemoveStage={handleRemoveStage}
                    />

                    <div className="mt-auto pt-4 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => navigate("/pipelines")}>
                            Cancelar
                        </Button>
                        <Button disabled={loading || !data.name} onClick={handleSave}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Pipeline"
                            )}
                        </Button>
                    </div>
                </Card>

                {aiEnabled && (
                    <PipelineAIChat
                        messages={messages}
                        input={input}
                        aiLoading={aiLoading}
                        messagesEndRef={messagesEndRef}
                        onInputChange={setInput}
                        onSend={handleSendMessage}
                        onKeyDown={handleKeyDown}
                    />
                )}
            </div>
        </MainContainer>
    );
};

export default PipelineCreator;
