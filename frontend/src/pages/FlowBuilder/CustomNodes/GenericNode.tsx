import React from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { X } from "lucide-react";
import { cn } from "../../../lib/utils";
import PaperCard from "../../../components/PaperCard";

interface GenericNodeData {
  onDelete?: () => void;
  [key: string]: unknown;
}

interface GenericNodeProps extends Partial<NodeProps<GenericNodeData>> {
  data: GenericNodeData;
  isConnectable?: boolean;
  title?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  onDelete?: () => void;
  showTargetHandle?: boolean;
  showSourceHandle?: boolean;
  className?: string;
}

const GenericNode: React.FC<GenericNodeProps> = ({
  data,
  isConnectable,
  title,
  icon: Icon,
  children,
  style = {},
  onDelete,
  showTargetHandle = true,
  showSourceHandle = true,
  className,
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    } else if (data.onDelete) {
      data.onDelete();
    }
  };

  const showDelete = !!(onDelete || data.onDelete);

  return (
    <PaperCard
      className={cn(
        "relative flex min-w-[180px] flex-col items-center justify-center p-2.5",
        "border border-[var(--border-default)] bg-white text-[var(--text-primary)]",
        "rounded-md text-sm shadow-[0_2px_5px_var(--shadow-appbar)]",
        className
      )}
      padding="default"
      style={style}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          style={{
            background: "var(--text-secondary)",
            width: 10,
            height: 10,
          }}
        />
      )}

      <div className="relative mb-2 flex w-full items-center justify-center">
        <div className="flex items-center gap-1.5">
          {Icon && <Icon className="h-4 w-4" />}
          {title && <span className="font-normal">{title}</span>}
        </div>
        {showDelete && (
          <button
            type="button"
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-sm p-0.5 text-[var(--text-muted)] hover:text-destructive focus:outline-none"
            onClick={handleDelete}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex w-full flex-col items-center text-xs text-[var(--text-secondary)]">
        {children}
      </div>

      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          style={{
            background: "var(--text-secondary)",
            width: 10,
            height: 10,
          }}
        />
      )}
    </PaperCard>
  );
};

export default GenericNode;
