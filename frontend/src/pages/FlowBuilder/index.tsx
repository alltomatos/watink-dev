/* @jsxImportSource react */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    getConnectedEdges,
    Controls,
    Background,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './flowbuilder.css';

import {
    Save,
    Play,
    Download,
    Upload,
    ArrowLeft,
    MessageSquare,
    CheckCircle2,
    Loader2,
    ChevronRight,
    ChevronLeft
} from 'lucide-react';
import { toast } from 'react-toastify';

import api from '../../services/api';
import toastError from "../../errors/toastError";
import NodesSidebar from './NodesSidebar';
import FlowChat from './FlowChat';
import NodeEditorSidebar from './NodeEditorSidebar';
import FlowSimulatorModal from './FlowSimulatorModal';

import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";

// Custom Nodes (Mantidos em JS por enquanto para evitar quebra de lógica complexa de canvas)
import StartNode from './CustomNodes/StartNode';
import EndNode from './CustomNodes/EndNode';
import SwitchNode from './CustomNodes/SwitchNode';
import TriggerNode from './CustomNodes/TriggerNode';
import PipelineNode from './CustomNodes/PipelineNode';
import KnowledgeNode from './CustomNodes/KnowledgeNode';
import MessageNode from './CustomNodes/MessageNode';
import MenuNode from './CustomNodes/MenuNode';
import DatabaseNode from './CustomNodes/DatabaseNode';
import FilterNode from './CustomNodes/FilterNode';
import TicketNode from './CustomNodes/TicketNode';
import WebhookNode from './CustomNodes/WebhookNode';
import APINode from './CustomNodes/APINode';
import HelpdeskNode from './CustomNodes/HelpdeskNode';
import GenericNode from './CustomNodes/GenericNode';

const nodeTypes = {
    start: StartNode,
    input: StartNode,
    end: EndNode,
    output: EndNode,
    switch: SwitchNode,
    trigger: TriggerNode,
    pipeline: PipelineNode,
    knowledge: KnowledgeNode,
    message: MessageNode,
    menu: MenuNode,
    database: DatabaseNode,
    filter: FilterNode,
    ticket: TicketNode,
    webhook: WebhookNode,
    api: APINode,
    helpdesk: HelpdeskNode,
    generic: GenericNode
};

let nodeSeq = 0;
const getId = () => `dndnode_${Date.now()}_${nodeSeq++}`;

const FlowBuilderContent = () => {
    const { flowId } = useParams();
    const navigate = useNavigate();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [flowName, setFlowName] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isNodesSidebarOpen, setIsNodesSidebarOpen] = useState(true);

    // Remoção de nó + arestas conectadas
    const handleNodeDelete = useCallback((nodeId: any) => {
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setSelectedNode(null);
        setIsEditorOpen(false);
    }, [setNodes, setEdges]);

    // Salvar configurações de um nó específico
    const handleNodeConfigSave = useCallback((nodeId: any, newData: any) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...newData } }
                    : node
            )
        );
        toast.success('Configurações salvas!');
    }, [setNodes]);

    // Gate de IA via settings (aiEnabled master + aiFlowBuilderEnabled)
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get("/settings");
                const masterEnabled = data.find((s: any) => s.key === "aiEnabled")?.value === "true";
                const flowBuilderEnabled = data.find((s: any) => s.key === "aiFlowBuilderEnabled")?.value === "true";
                if (masterEnabled && flowBuilderEnabled) {
                    setAiEnabled(true);
                    setIsChatOpen(true);
                } else {
                    setAiEnabled(false);
                    setIsChatOpen(false);
                }
            } catch {
                console.error("Erro ao carregar configurações");
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const fetchFlow = async () => {
            try {
                const { data } = await api.get(`/flows/${flowId}`);
                setFlowName(data.name);
                setIsActive(data.active !== false);

                if (Array.isArray(data.nodes)) {
                    const hydratedNodes = data.nodes.map((node: any) => ({
                        ...node,
                        data: {
                            ...node.data,
                            onDelete: () => handleNodeDelete(node.id),
                        },
                    }));
                    setNodes(hydratedNodes);
                }
                if (Array.isArray(data.edges)) setEdges(data.edges);
                setLoading(false);
            } catch (_err) {
                toastError(_err);
                navigate('/flowbuilder');
            }
        };
        fetchFlow();
    }, [flowId, navigate, setNodes, setEdges, handleNodeDelete]);

    const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const handleSave = useCallback(async (silent = false) => {
        if (!silent) setSaving(true);
        try {
            await api.put(`/flows/${flowId}`, {
                name: flowName,
                nodes,
                edges,
                active: isActive,
            });
            if (!silent) toast.success("Fluxo salvo com sucesso");
        } catch (_err) {
            if (!silent) toastError(_err);
        } finally {
            if (!silent) setSaving(false);
        }
    }, [flowId, flowName, nodes, edges, isActive]);

    // AutoSave com debounce de 5s
    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (loading) return;
        if (nodes.length === 0 && edges.length === 0) return;

        saveTimeoutRef.current = setTimeout(() => {
            handleSave(true);
        }, 5000);

        return () => clearTimeout(saveTimeoutRef.current ?? undefined);
    }, [nodes, edges, loading, handleSave]);

    // Alternar ativo/inativo — persiste via PUT (backend não tem /toggle)
    const handleToggle = useCallback(async () => {
        const next = !isActive;
        setIsActive(next);
        try {
            await api.put(`/flows/${flowId}`, {
                name: flowName,
                nodes,
                edges,
                active: next,
            });
            toast.success(next ? "Fluxo ativado" : "Fluxo pausado");
        } catch (_err) {
            setIsActive(!next);
            toastError(_err);
        }
    }, [isActive, flowId, flowName, nodes, edges]);

    const validateFlow = useCallback(() => {
        const connectedEdges = getConnectedEdges(nodes, edges);
        const unconnectedNodes = nodes.filter(
            (node) => !connectedEdges.find((edge) => edge.source === node.id || edge.target === node.id)
        );
        if (unconnectedNodes.length > 0) {
            toast.warning(`Atenção: Existem ${unconnectedNodes.length} nós desconectados.`);
            return false;
        }
        toast.success("Fluxo validado! Todas as conexões parecem corretas.");
        return true;
    }, [nodes, edges]);

    const handleExport = useCallback(() => {
        const flowData = { nodes, edges };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(flowData)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `flow_${flowId}.json`;
        link.click();
    }, [nodes, edges, flowId]);

    const handleImport = useCallback((event: any) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const fileReader = new FileReader();
        fileReader.readAsText(file, "UTF-8");
        fileReader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target!.result as string);
                if (parsed.nodes && parsed.edges) {
                    setNodes(parsed.nodes);
                    setEdges(parsed.edges);
                    toast.success("Fluxo importado com sucesso!");
                } else {
                    toast.error("Arquivo de fluxo inválido");
                }
            } catch {
                toast.error("Erro ao ler arquivo");
            }
        };
    }, [setNodes, setEdges]);

    const handleSimulate = useCallback(async (id: any, message: any) => {
        const { data } = await api.post(`/flows/${id}/simulate`, { message });
        return data;
    }, []);

    const handleAIResponse = useCallback((newNodes: any, newEdges: any) => {
        if (newNodes && newEdges) {
            setNodes(newNodes);
            setEdges(newEdges);
        }
    }, [setNodes, setEdges]);

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: any) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/reactflow/label');
            if (typeof type === 'undefined' || !type) return;

            const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
            const position = reactFlowInstance!.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const nodeId = getId();
            const newNode = {
                id: nodeId,
                type,
                position,
                data: {
                    label: label || `${type} node`,
                    config: {},
                    onDelete: () => handleNodeDelete(nodeId),
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes, handleNodeDelete]
    );

    const onNodeClick = useCallback((event: any, node: any) => {
        setSelectedNode(node);
        setIsEditorOpen(true);
    }, []);

    const handleCloseEditor = useCallback(() => {
        setIsEditorOpen(false);
        setSelectedNode(null);
    }, []);

    if (loading) {
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
            {/* Toolbar Topo */}
            <header className="flex h-16 items-center justify-between border-b px-6 shrink-0 z-10 bg-card">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/flowbuilder')}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold leading-none">{flowName}</h1>
                        <p className="text-xs text-muted-foreground mt-1">ID: {flowId}</p>
                    </div>
                    <Badge variant={isActive ? "secondary" : "outline"} className={isActive ? "bg-green-100 text-green-700" : ""}>
                        {isActive ? "Ativo" : "Pausado"}
                    </Badge>
                </div>

                <div className="flex items-center gap-3">
                    <input
                        accept=".json"
                        className="hidden"
                        id="import-flow-file"
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImport}
                    />

                    <div className="flex items-center gap-2 mr-2 border-r pr-3">
                        <Label htmlFor="active-toggle" className="text-xs font-medium cursor-pointer">Status:</Label>
                        <Switch
                            id="active-toggle"
                            checked={isActive}
                            onCheckedChange={handleToggle}
                        />
                    </div>

                    <Button variant="outline" size="sm" className="gap-2 text-green-600" onClick={validateFlow}>
                        <CheckCircle2 size={14} /> Validar
                    </Button>

                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsSimulatorOpen(true)}>
                        <Play size={14} fill="currentColor" /> Simular
                    </Button>

                    <Button variant="outline" size="sm" className="gap-2 hidden md:flex" onClick={() => fileInputRef.current?.click()}>
                        <Upload size={14} /> Importar
                    </Button>

                    <Button variant="outline" size="sm" className="gap-2 hidden md:flex" onClick={handleExport}>
                        <Download size={14} /> Exportar
                    </Button>

                    <Button size="sm" className="gap-2 min-w-[100px]" onClick={() => handleSave(false)} disabled={saving}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? "Salvando..." : "Salvar"}
                    </Button>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden relative">
                {/* Sidebar de Nós */}
                <div className={`transition-all duration-300 border-r bg-card z-20 overflow-y-auto shrink-0 ${isNodesSidebarOpen ? 'w-64' : 'w-0 border-none'}`}>
                    {isNodesSidebarOpen && <NodesSidebar />}
                </div>

                {/* Toggle Sidebar */}
                <button 
                    onClick={() => setIsNodesSidebarOpen(!isNodesSidebarOpen)}
                    className="absolute left-[248px] top-4 z-30 h-8 w-8 rounded-full border bg-background shadow-md flex items-center justify-center transition-all hover:bg-muted"
                    style={{ left: isNodesSidebarOpen ? '240px' : '-4px' }}
                >
                    {isNodesSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>

                {/* Canvas de Desenho */}
                <div className="flex-1 relative bg-slate-50" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={(instance) => setReactFlowInstance(instance)}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        onNodeClick={onNodeClick}
                        nodeTypes={nodeTypes as any}
                        fitView
                    >
                        <Background color="var(--border-default)" gap={20} />
                        <Controls position="bottom-right" className="bg-white border rounded-lg shadow-xl" />
                    </ReactFlow>
                </div>

                {/* Sidebar de Edição de Nó (Direita) */}
                {isEditorOpen && selectedNode && (
                    <div className="w-80 border-l bg-card z-20 overflow-y-auto shrink-0 animate-in slide-in-from-right duration-300">
                        <NodeEditorSidebar
                            open={isEditorOpen}
                            node={selectedNode}
                            onClose={handleCloseEditor}
                            onSave={handleNodeConfigSave}
                            onDelete={handleNodeDelete}
                        />
                    </div>
                )}

                {/* Chat IA (gate por settings) */}
                {aiEnabled && isChatOpen && (
                    <div className="w-80 border-l bg-card z-20 overflow-y-auto shrink-0 animate-in slide-in-from-right duration-300">
                        <div className="flex justify-start p-2 border-b">
                            <Button variant="ghost" size="icon" onClick={() => setIsChatOpen(false)}>
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                        <FlowChat onFlowGenerated={handleAIResponse} />
                    </div>
                )}

                {/* Reabrir Chat IA */}
                {aiEnabled && !isChatOpen && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-4 top-4 z-30 rounded-full shadow-md"
                        onClick={() => setIsChatOpen(true)}
                    >
                        <MessageSquare size={16} className="text-primary" />
                    </Button>
                )}
            </main>

            <FlowSimulatorModal
                open={isSimulatorOpen}
                onClose={() => setIsSimulatorOpen(false)}
                flowId={flowId}
                flowName={flowName}
                onSimulate={handleSimulate}
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
