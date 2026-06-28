/* @jsxImportSource react */
import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { NodeTypes } from '@xyflow/react';
import { Loader2, ChevronRight, ChevronLeft, MessageSquare } from 'lucide-react';

import type { FlowNode } from './nodeEditorTypes';
import NodesSidebar from './NodesSidebar';
import FlowChat from './FlowChat';
import NodeEditorSidebar from './NodeEditorSidebar';
import FlowSimulatorModal from './FlowSimulatorModal';
import { FlowToolbar } from './components/FlowToolbar';
import { FlowCanvas } from './components/FlowCanvas';
import { useFlowBuilder } from './hooks/useFlowBuilder';

import { Button } from '../../components/ui/button';

import StartNode from './CustomNodes/StartNode';
import EndNode from './CustomNodes/EndNode';
import SwitchNode from './CustomNodes/SwitchNode';
import TriggerNode from './CustomNodes/TriggerNode';
import PipelineNode from './CustomNodes/PipelineNode';
import KnowledgeNode from './CustomNodes/KnowledgeNode';
import AgentNode from './CustomNodes/AgentNode';
import MessageNode from './CustomNodes/MessageNode';
import MenuNode from './CustomNodes/MenuNode';
import DatabaseNode from './CustomNodes/DatabaseNode';
import FilterNode from './CustomNodes/FilterNode';
import TicketNode from './CustomNodes/TicketNode';
import WebhookNode from './CustomNodes/WebhookNode';
import APINode from './CustomNodes/APINode';
import HelpdeskNode from './CustomNodes/HelpdeskNode';
import GenericNode from './CustomNodes/GenericNode';

import './flowbuilder.css';

const nodeTypes = {
    start: StartNode,
    input: StartNode,
    end: EndNode,
    output: EndNode,
    switch: SwitchNode,
    trigger: TriggerNode,
    pipeline: PipelineNode,
    knowledge: KnowledgeNode,
    agent: AgentNode,
    message: MessageNode,
    menu: MenuNode,
    database: DatabaseNode,
    filter: FilterNode,
    ticket: TicketNode,
    webhook: WebhookNode,
    api: APINode,
    helpdesk: HelpdeskNode,
    generic: GenericNode,
};

const FlowBuilderContent = () => {
    const fb = useFlowBuilder();

    if (fb.loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Carregando editor de fluxo...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
            <FlowToolbar
                flowName={fb.flowName}
                flowId={fb.flowId}
                isActive={fb.isActive}
                saving={fb.saving}
                fileInputRef={fb.fileInputRef}
                onNavigateBack={() => fb.navigate('/flowbuilder')}
                onToggle={fb.handleToggle}
                onValidate={fb.validateFlow}
                onSimulate={() => fb.setIsSimulatorOpen(true)}
                onImportClick={() => fb.fileInputRef.current?.click()}
                onExport={fb.handleExport}
                onSave={() => fb.handleSave(false)}
                onFileChange={fb.handleImport}
            />

            <main className="flex flex-1 overflow-hidden relative">
                <div
                    className={`transition-all duration-300 border-r bg-card z-20 overflow-y-auto shrink-0 ${
                        fb.isNodesSidebarOpen ? 'w-72' : 'w-0 border-none'
                    }`}
                >
                    {fb.isNodesSidebarOpen && <NodesSidebar />}
                </div>

                <button
                    onClick={() => fb.setIsNodesSidebarOpen(!fb.isNodesSidebarOpen)}
                    className="absolute left-[248px] top-4 z-30 h-8 w-8 rounded-full border bg-background shadow-md flex items-center justify-center transition-all hover:bg-muted"
                    style={{ left: fb.isNodesSidebarOpen ? '272px' : '-4px' }}
                >
                    {fb.isNodesSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                <FlowCanvas
                    canvasRef={fb.reactFlowWrapper}
                    nodes={fb.nodes}
                    edges={fb.edges}
                    nodeTypes={nodeTypes as unknown as NodeTypes}
                    onNodesChange={fb.onNodesChange}
                    onEdgesChange={fb.onEdgesChange}
                    onConnect={fb.onConnect}
                    onInit={fb.setReactFlowInstance}
                    onDrop={fb.onDrop}
                    onDragOver={fb.onDragOver}
                    onNodeClick={fb.onNodeClick}
                />

                {fb.isEditorOpen && fb.selectedNode && (
                    <div className="w-80 border-l bg-card z-20 overflow-y-auto shrink-0 animate-in slide-in-from-right duration-300">
                        <NodeEditorSidebar
                            open={fb.isEditorOpen}
                            node={fb.selectedNode as unknown as FlowNode}
                            onClose={fb.handleCloseEditor}
                            onSave={fb.handleNodeConfigSave}
                            onDelete={fb.handleNodeDelete}
                        />
                    </div>
                )}

                {fb.aiEnabled && fb.isChatOpen && (
                    <div className="w-80 border-l bg-card z-20 overflow-y-auto shrink-0 animate-in slide-in-from-right duration-300">
                        <div className="flex justify-start p-2 border-b">
                            <Button variant="ghost" size="icon" onClick={() => fb.setIsChatOpen(false)}>
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                        <FlowChat onFlowGenerated={fb.handleAIResponse as (nodes: unknown[], edges: unknown[]) => void} />
                    </div>
                )}

                {fb.aiEnabled && !fb.isChatOpen && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-4 top-4 z-30 rounded-full shadow-md"
                        onClick={() => fb.setIsChatOpen(true)}
                    >
                        <MessageSquare size={16} className="text-primary" />
                    </Button>
                )}
            </main>

            <FlowSimulatorModal
                open={fb.isSimulatorOpen}
                onClose={() => fb.setIsSimulatorOpen(false)}
                flowId={fb.flowId}
                flowName={fb.flowName}
                onSimulate={fb.handleSimulate}
            />
        </div>
    );
};

const FlowBuilder = () => (
    <ReactFlowProvider>
        <FlowBuilderContent />
    </ReactFlowProvider>
);

export default FlowBuilder;


