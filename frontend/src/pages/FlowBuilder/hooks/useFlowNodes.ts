import { useState, useCallback, useRef } from 'react';
import { useNodesState } from '@xyflow/react';
import type { Node } from '@xyflow/react';

let nodeSeq = 0;
const getId = () => `dndnode_${Date.now()}_${nodeSeq++}`;

interface UseFlowNodesOptions {
    reactFlowInstance: unknown;
    onEditorOpen: (node: Node) => void;
    onEditorClose: () => void;
}

export function useFlowNodes({ reactFlowInstance, onEditorOpen, onEditorClose }: UseFlowNodesOptions) {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const handleNodeDeleteRef = useRef<(nodeId: string) => void>(() => undefined);

    const handleNodeDelete = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter((node) => node.id !== nodeId));
        setSelectedNode(null);
        onEditorClose();
    }, [setNodes, onEditorClose]);

    handleNodeDeleteRef.current = handleNodeDelete;

    const handleNodeConfigSave = useCallback((nodeId: string, newData: Record<string, unknown>) => {
        setNodes((nds) =>
            nds.map((node) =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...newData } }
                    : node
            )
        );
    }, [setNodes]);

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        onEditorOpen(node);
    }, [onEditorOpen]);

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

            const rfInstance = reactFlowInstance as { screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number } };
            const position = rfInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const nodeId = getId();
            const newNode: Node = {
                id: nodeId,
                type,
                position,
                data: {
                    label: label || `${type} node`,
                    config: {},
                    onDelete: () => handleNodeDeleteRef.current(nodeId),
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes]
    );

    const hydrateNodes = useCallback((rawNodes: Node[]) => {
        return rawNodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                onDelete: () => handleNodeDeleteRef.current(node.id),
            },
        }));
    }, []);

    return {
        nodes,
        setNodes,
        onNodesChange,
        selectedNode,
        setSelectedNode,
        handleNodeDelete,
        handleNodeConfigSave,
        onNodeClick,
        onDragOver,
        onDrop,
        hydrateNodes,
    };
}
