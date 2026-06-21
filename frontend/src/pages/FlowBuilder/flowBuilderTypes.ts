import type { Node, Edge } from 'reactflow';

export interface FlowData {
    name: string;
    active: boolean;
    nodes: Node[];
    edges: Edge[];
}

export interface SimulateHandler {
    (id: string | undefined, message: string): Promise<unknown>;
}

export interface AIResponseHandler {
    (newNodes: Node[], newEdges: Edge[]): void;
}
