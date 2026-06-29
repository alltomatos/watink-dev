import type { Node, Edge } from '@xyflow/react';

export interface FlowData {
    name: string;
    active: boolean;
    nodes: Node[];
    edges: Edge[];
}

/**
 * Removes legacy `width`/`height` persisted by reactflow v11.
 * In @xyflow/react v12 measured dimensions live under `node.measured`,
 * so stale top-level `width`/`height` must be cleared to avoid layout conflicts.
 */
export function stripLegacyDimensions(nodes: Node[]): Node[] {
    return nodes.map((node) => {
        const { width: _width, height: _height, ...rest } = node as Node & {
            width?: number;
            height?: number;
        };
        void _width;
        void _height;
        return rest as Node;
    });
}

export interface SimulateHandler {
    (id: string | undefined, message: string): Promise<unknown>;
}

export interface AIResponseHandler {
    (newNodes: Node[], newEdges: Edge[]): void;
}
