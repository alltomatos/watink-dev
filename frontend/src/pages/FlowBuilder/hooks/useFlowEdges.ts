import { useCallback } from 'react';
import { addEdge, useEdgesState } from 'reactflow';
import type { Connection } from 'reactflow';

export function useFlowEdges() {
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
