import { useState, useCallback } from 'react';
import type { Node } from '@xyflow/react';

export function useFlowEditor() {
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [isNodesSidebarOpen, setIsNodesSidebarOpen] = useState(true);

    const openEditor = useCallback((node: Node) => {
        setSelectedNode(node);
        setIsEditorOpen(true);
    }, []);

    const closeEditor = useCallback(() => {
        setIsEditorOpen(false);
        setSelectedNode(null);
    }, []);

    return {
        selectedNode,
        setSelectedNode,
        isEditorOpen,
        isSimulatorOpen,
        setIsSimulatorOpen,
        isNodesSidebarOpen,
        setIsNodesSidebarOpen,
        openEditor,
        closeEditor,
    };
}
