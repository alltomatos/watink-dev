import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addEdge, useNodesState, useEdgesState, getConnectedEdges } from 'reactflow';
import type { Node, Edge, Connection } from 'reactflow';
import { toast } from 'react-toastify';

import api from '../../../services/api';
import toastError from '../../../errors/toastError';

let nodeSeq = 0;
const getId = () => `dndnode_${Date.now()}_${nodeSeq++}`;

export function useFlowBuilder() {
    const { flowId } = useParams<{ flowId: string }>();
    const navigate = useNavigate();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [flowName, setFlowName] = useState('');
    const [isActive, setIsActive] = useState(false);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isNodesSidebarOpen, setIsNodesSidebarOpen] = useState(true);

    const handleNodeDelete = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
        setSelectedNode(null);
        setIsEditorOpen(false);
    }, [setNodes, setEdges]);

    const handleNodeConfigSave = useCallback((nodeId: string, newData: Record<string, unknown>) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...newData } }
                    : node
            )
        );
        toast.success('Configurações salvas!');
    }, [setNodes]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get('/settings');
                const masterEnabled = data.find((s: { key: string; value: string }) => s.key === 'aiEnabled')?.value === 'true';
                const flowBuilderEnabled = data.find((s: { key: string; value: string }) => s.key === 'aiFlowBuilderEnabled')?.value === 'true';
                if (masterEnabled && flowBuilderEnabled) {
                    setAiEnabled(true);
                    setIsChatOpen(true);
                } else {
                    setAiEnabled(false);
                    setIsChatOpen(false);
                }
            } catch {
                console.error('Erro ao carregar configurações');
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
                    const hydratedNodes = data.nodes.map((node: Node) => ({
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
            } catch (err) {
                toastError(err);
                navigate('/flowbuilder');
            }
        };
        fetchFlow();
    }, [flowId, navigate, setNodes, setEdges, handleNodeDelete]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    const handleSave = useCallback(async (silent = false) => {
        if (!silent) setSaving(true);
        try {
            await api.put(`/flows/${flowId}`, {
                name: flowName,
                nodes,
                edges,
                active: isActive,
            });
            if (!silent) toast.success('Fluxo salvo com sucesso');
        } catch (err) {
            if (!silent) toastError(err);
        } finally {
            if (!silent) setSaving(false);
        }
    }, [flowId, flowName, nodes, edges, isActive]);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (loading) return;
        if (nodes.length === 0 && edges.length === 0) return;

        saveTimeoutRef.current = setTimeout(() => {
            handleSave(true);
        }, 5000);

        return () => clearTimeout(saveTimeoutRef.current ?? undefined);
    }, [nodes, edges, loading, handleSave]);

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
            toast.success(next ? 'Fluxo ativado' : 'Fluxo pausado');
        } catch (err) {
            setIsActive(!next);
            toastError(err);
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
        toast.success('Fluxo validado! Todas as conexões parecem corretas.');
        return true;
    }, [nodes, edges]);

    const handleExport = useCallback(() => {
        const flowData = { nodes, edges };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(flowData))}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `flow_${flowId}.json`;
        link.click();
    }, [nodes, edges, flowId]);

    const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const fileReader = new FileReader();
        fileReader.readAsText(file, 'UTF-8');
        fileReader.onload = (e) => {
            try {
                const parsed = JSON.parse(e.target!.result as string) as { nodes?: Node[]; edges?: Edge[] };
                if (parsed.nodes && parsed.edges) {
                    setNodes(parsed.nodes);
                    setEdges(parsed.edges);
                    toast.success('Fluxo importado com sucesso!');
                } else {
                    toast.error('Arquivo de fluxo inválido');
                }
            } catch {
                toast.error('Erro ao ler arquivo');
            }
        };
    }, [setNodes, setEdges]);

    const handleSimulate = useCallback(async (id: string | undefined, message: string) => {
        const { data } = await api.post(`/flows/${id}/simulate`, { message });
        return data;
    }, []);

    const handleAIResponse = useCallback((newNodes: Node[], newEdges: Edge[]) => {
        if (newNodes && newEdges) {
            setNodes(newNodes);
            setEdges(newEdges);
        }
    }, [setNodes, setEdges]);

    const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/reactflow/label');
            if (!type) return;

            const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
            const position = reactFlowInstance!.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const nodeId = getId();
            const newNode: Node = {
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

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        setIsEditorOpen(true);
    }, []);

    const handleCloseEditor = useCallback(() => {
        setIsEditorOpen(false);
        setSelectedNode(null);
    }, []);

    return {
        flowId,
        navigate,
        reactFlowWrapper,
        fileInputRef,
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        reactFlowInstance,
        setReactFlowInstance,
        loading,
        saving,
        flowName,
        isActive,
        aiEnabled,
        isChatOpen,
        setIsChatOpen,
        selectedNode,
        isEditorOpen,
        isSimulatorOpen,
        setIsSimulatorOpen,
        isNodesSidebarOpen,
        setIsNodesSidebarOpen,
        onConnect,
        handleSave,
        handleToggle,
        validateFlow,
        handleExport,
        handleImport,
        handleSimulate,
        handleAIResponse,
        onDragOver,
        onDrop,
        onNodeClick,
        handleCloseEditor,
        handleNodeConfigSave,
        handleNodeDelete,
    };
}
