import { useCallback } from 'react';
import type { Node, Edge } from 'reactflow';
import { toast } from 'react-toastify';

import api from '../../../services/api';

interface UseFlowIOOptions {
    flowId: string | undefined;
    nodes: Node[];
    edges: Edge[];
    setNodes: (nodes: Node[] | ((nds: Node[]) => Node[])) => void;
    setEdges: (edges: Edge[] | ((eds: Edge[]) => Edge[])) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
}

export function useFlowIO({ flowId, nodes, edges, setNodes, setEdges, fileInputRef }: UseFlowIOOptions) {
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
        // reset so the same file can be re-imported
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [setNodes, setEdges, fileInputRef]);

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

    return {
        handleExport,
        handleImport,
        handleSimulate,
        handleAIResponse,
    };
}
