declare module 'qrcode.react';
declare module 'react-color';
declare module 'react-modal-image';
declare module 'react-dom/client';
declare module 'react-signature-canvas' {
  import React from 'react';
  interface SignatureCanvasProps {
    penColor?: string;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    onBegin?: () => void;
    onEnd?: () => void;
    [key: string]: any;
  }
  class SignatureCanvas extends React.Component<SignatureCanvasProps> {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string): string;
    fromDataURL(dataURL: string): void;
    getCanvas(): HTMLCanvasElement;
    getTrimmedCanvas(): HTMLCanvasElement;
    off(): void;
    on(): void;
  }
  export default SignatureCanvas;
}
declare module 'emoji-mart';
declare module 'mic-recorder-to-mp3' {
  const MicRecorder: any;
  export default MicRecorder;
}
declare module '*.png';
declare module '*.mp3';
declare module 'react-beautiful-dnd' {
  export interface DropResult {
    draggableId: string;
    type: string;
    source: { droppableId: string; index: number };
    destination?: { droppableId: string; index: number } | null;
    reason: 'DROP' | 'CANCEL';
    combine?: any;
    mode: 'FLUID' | 'SNAP';
  }
  export const DragDropContext: any;
  export const Droppable: any;
  export const Draggable: any;
}
declare module '@virtuoso.dev/message-list';
