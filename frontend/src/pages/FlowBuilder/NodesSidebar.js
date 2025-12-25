import React from 'react';

const onDragStart = (event, nodeType, label) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
};

const NodesSidebar = () => {
    return (
        <aside style={{
            width: '250px',
            padding: '15px',
            borderRight: '1px solid #eee',
            background: '#fcfcfc',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            overflowY: 'auto'
        }}>
            <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#555' }}>
                Blocos Disponíveis
            </div>

            <div
                className="dndnode input"
                onDragStart={(event) => onDragStart(event, 'input', 'Início')}
                draggable
                style={nodeStyle}
            >
                🚀 Início Padrão
            </div>

            <div
                className="dndnode"
                onDragStart={(event) => onDragStart(event, 'trigger', 'Gatilho')}
                draggable
                style={{ ...nodeStyle, borderColor: '#ff9800' }}
            >
                ⚡ Gatilho (Trigger)
            </div>

            <div
                className="dndnode"
                onDragStart={(event) => onDragStart(event, 'message', 'Mensagem')}
                draggable
                style={nodeStyle}
            >
                💬 Mensagem
            </div>

            <div
                className="dndnode"
                onDragStart={(event) => onDragStart(event, 'menu', 'Menu')}
                draggable
                style={{ ...nodeStyle, borderColor: '#009688' }}
            >
                📋 Menu de Opções
            </div>

            <div
                className="dndnode"
                onDragStart={(event) => onDragStart(event, 'switch', 'Decisão')}
                draggable
                style={{ ...nodeStyle, borderColor: '#f50057' }}
            >
                🔀 Decisão (Switch)
            </div>

            <div
                className="dndnode"
                onDragStart={(event) => onDragStart(event, 'pipeline', 'Pipeline')}
                draggable
                style={{ ...nodeStyle, borderColor: '#2196f3' }}
            >
                📊 Pipeline
            </div>

             <div
                className="dndnode"
                onDragStart={(event) => onDragStart(event, 'knowledge', 'Conhecimento')}
                draggable
                style={{ ...nodeStyle, borderColor: '#9c27b0' }}
            >
                📚 Conhecimento
            </div>

            <div
                className="dndnode output"
                onDragStart={(event) => onDragStart(event, 'output', 'Fim')}
                draggable
                style={nodeStyle}
            >
                🏁 Fim
            </div>

            <div style={{ marginTop: 'auto', fontSize: '12px', color: '#999' }}>
                Arraste para o painel
            </div>
        </aside>
    );
};

const nodeStyle = {
    padding: '10px',
    border: '1px solid #1a192b',
    borderRadius: '5px',
    cursor: 'grab',
    marginBottom: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'white',
    color: '#333',
    fontSize: '14px'
};

export default NodesSidebar;
