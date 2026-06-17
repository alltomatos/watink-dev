import React from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface Contact {
    name?: string;
}

interface Deal {
    id: number;
    title: string;
    contact?: Contact;
    value?: number | string;
    updatedAt?: string;
    stageId?: number;
}

interface Stage {
    id: number;
    name: string;
}

interface ColumnData {
    items: Deal[];
}

interface Pipeline {
    stages: Stage[];
}

interface PipelineKanbanProps {
    pipeline?: Pipeline;
    columns: Record<string | number, ColumnData>;
    setColumns: React.Dispatch<React.SetStateAction<Record<string | number, ColumnData>>>;
    onDragEnd: (result: DropResult) => void;
    isEnterprise?: boolean;
}

const stageColors = [
    { bg: "var(--status-info-bg)", header: "var(--status-info)", light: "var(--status-info-8)" },
    { bg: "var(--status-warning-bg)", header: "var(--status-warning)", light: "var(--status-warning-bg)" },
    { bg: "var(--status-success-bg)", header: "var(--status-success)", light: "var(--status-success-10)" },
    { bg: "var(--status-error-bg)", header: "var(--status-error)", light: "var(--status-error-10)" },
    { bg: "var(--status-default-bg)", header: "var(--status-default-text)", light: "var(--status-default-bg)" },
    { bg: "var(--status-info-bg)", header: "var(--status-info)", light: "var(--status-info-8)" },
    { bg: "var(--status-warning-bg)", header: "var(--status-warning)", light: "var(--status-warning-bg)" },
    { bg: "var(--status-default-bg)", header: "var(--status-default-text)", light: "var(--status-default-bg)" },
    { bg: "var(--status-info-bg)", header: "var(--status-info)", light: "var(--status-info-15)" },
    { bg: "var(--status-error-bg)", header: "var(--status-error)", light: "var(--status-error-10)" },
];

const getStageColor = (index: number) => stageColors[index % stageColors.length];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const calculateTotal = (items: Deal[]) =>
    items.reduce((acc, item) => acc + (parseFloat(String(item.value)) || 0), 0);

const PipelineKanban: React.FC<PipelineKanbanProps> = ({
    pipeline,
    columns,
    onDragEnd,
    isEnterprise = false,
}) => {
    return (
        <div className="flex flex-grow overflow-x-auto h-full p-4">
            <DragDropContext onDragEnd={onDragEnd}>
                {pipeline?.stages.map((stage, stageIndex) => {
                    const columnData = columns[stage.id];
                    if (!columnData) return null;

                    const color = getStageColor(stageIndex);
                    const totalValue = calculateTotal(columnData.items);

                    return (
                        <div
                            key={stage.id}
                            className="min-w-[300px] w-[300px] mr-4 rounded-lg flex flex-col max-h-full overflow-hidden"
                            style={{
                                backgroundColor: isEnterprise ? "var(--bg-surface-alt)" : color.bg,
                                boxShadow: "0 1px 3px var(--border-divider), 0 1px 2px var(--overlay-dark)",
                            }}
                        >
                            {/* Column header */}
                            {isEnterprise ? (
                                <div
                                    className="p-3 font-bold flex flex-col items-start bg-card border-b"
                                    style={{ borderTop: `4px solid ${color.header}` }}
                                >
                                    <div className="flex justify-between w-full items-center">
                                        <span className="text-sm font-semibold">{stage.name}</span>
                                        <span
                                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                            style={{
                                                backgroundColor: "var(--border-default)",
                                                color: "var(--text-primary)",
                                            }}
                                        >
                                            {columnData.items.length}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Total: {formatCurrency(totalValue)}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="p-3 font-bold flex justify-between items-center"
                                    style={{
                                        backgroundColor: color.header,
                                        color: "var(--bg-surface)",
                                        textShadow: "0 1px 2px var(--overlay-dark)",
                                    }}
                                >
                                    <span className="text-sm">{stage.name}</span>
                                    <span
                                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: "var(--overlay-light)",
                                            color: "var(--bg-surface)",
                                        }}
                                    >
                                        {columnData.items.length}
                                    </span>
                                </div>
                            )}

                            {/* Droppable area */}
                            <Droppable droppableId={String(stage.id)} key={stage.id}>
                                {(provided: any, snapshot: any) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="p-2 flex-grow overflow-y-auto min-h-[100px] transition-colors"
                                        style={{
                                            background: isEnterprise
                                                ? snapshot.isDraggingOver
                                                    ? "var(--status-info-bg)"
                                                    : "transparent"
                                                : snapshot.isDraggingOver
                                                ? color.light
                                                : color.bg,
                                        }}
                                    >
                                        {columnData.items.map((item, index) => {
                                            const isStagnant =
                                                isEnterprise &&
                                                item.updatedAt &&
                                                differenceInDays(new Date(), parseISO(item.updatedAt)) > 7;

                                            return (
                                                <Draggable
                                                    key={item.id}
                                                    draggableId={String(item.id)}
                                                    index={index}
                                                >
                                                    {(provided: any, snapshot: any) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={cn(
                                                                "mb-2 rounded-lg bg-white shadow-sm transition-transform duration-200 relative",
                                                                "hover:-translate-y-0.5 hover:shadow-md",
                                                                isStagnant && "border-l-4 border-[var(--status-error)]"
                                                            )}
                                                            style={{
                                                                ...provided.draggableProps.style,
                                                                opacity: snapshot.isDragging ? 0.8 : 1,
                                                            }}
                                                        >
                                                            <div className="px-3 py-2">
                                                                {isEnterprise && (
                                                                    <span
                                                                        className="absolute top-2 right-2 text-[0.7rem] font-bold px-1.5 py-0.5 rounded"
                                                                        style={{
                                                                            backgroundColor: "var(--status-success-bg)",
                                                                            color: "var(--status-success)",
                                                                        }}
                                                                    >
                                                                        {formatCurrency(
                                                                            parseFloat(String(item.value)) || 0
                                                                        )}
                                                                    </span>
                                                                )}
                                                                <p
                                                                    className="font-semibold text-[0.9rem]"
                                                                    style={{
                                                                        paddingRight: isEnterprise ? "60px" : 0,
                                                                    }}
                                                                >
                                                                    {item.title}
                                                                </p>
                                                                <p className="text-[0.8rem] text-muted-foreground">
                                                                    {item.contact?.name ?? "Sem contato"}
                                                                </p>
                                                                {!isEnterprise && (
                                                                    <p className="text-[0.8rem] text-muted-foreground">
                                                                        R$ {item.value ?? "0,00"}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>

                            <Button variant="ghost" className="w-full rounded-none rounded-b-lg text-sm">
                                <Plus className="mr-1 h-4 w-4" />
                                Novo Deal
                            </Button>
                        </div>
                    );
                })}
            </DragDropContext>
        </div>
    );
};

export default PipelineKanban;
