import { useState, useCallback, useRef } from 'react';
import { useNodesState } from 'reactflow';
import type { Node } from 'reactflow';

let nodeSeq = 0;
const getId = () => `dndnode_${Date.now()}_${nodeSeq++}`;

interface UseFlowNodesOptions {
    reactFlowWrapper: React.RefObject<HTMLDivElement>;
    reactFlowInstance: unknown;
    onEditorOpen: (node: Node) => void;
    onEditorClose: () => void;
}

export function useFlowNodes({ reactFlowWrapper, reactFlowInstance, onEditorOpen, onEditorClose }: UseFlowNodesOptions) {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
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

            const rfInstance = reactFlowInstance as { project: (pos: { x: number; y: number }) => { x: number; y: number } };
            const reactFlowBounds = reactFlowWrapper.current!.getBoundingClientRect();
            const position = rfInstance.project({
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
                    onDelete: () => handleNodeDeleteRef.current(nodeId),
                },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, reactFlowWrapper, setNodes]
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
