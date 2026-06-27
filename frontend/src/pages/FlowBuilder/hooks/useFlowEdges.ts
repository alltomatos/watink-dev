import { useCallback } from 'react';
import { addEdge, useEdgesState } from '@xyflow/react';
import type { Connection, Edge } from '@xyflow/react';

export function useFlowEdges() {
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return {
        edges,
        setEdges,
        onEdgesChange,
        onConnect,
    };
}
