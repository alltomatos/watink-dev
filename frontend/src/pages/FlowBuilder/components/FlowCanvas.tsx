import React from 'react';
import ReactFlow, {
    Background,
    Controls,
} from 'reactflow';
import type {
    Node,
    Edge,
    OnNodesChange,
    OnEdgesChange,
    Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface FlowCanvasProps {
    canvasRef: React.RefObject<HTMLDivElement>;
    nodes: Node[];
    edges: Edge[];
    nodeTypes: any;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (params: Connection) => void;
    onInit: (instance: any) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onNodeClick: (event: React.MouseEvent, node: Node) => void;
}

export function FlowCanvas({
    canvasRef,
    nodes,
    edges,
    nodeTypes,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onInit,
    onDrop,
    onDragOver,
    onNodeClick,
}: FlowCanvasProps) {
    return (
        <div className="flex-1 relative bg-slate-50" ref={canvasRef}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={onInit}
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
    );
}

