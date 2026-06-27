import React from 'react';
import { Position } from '@xyflow/react';
import { List } from 'lucide-react';
import BaseNode, { HandleConfig } from './BaseNode';

interface MenuOption {
  id?: string;
  label?: string;
}

interface MenuNodeProps {
  data: Record<string, unknown>;
  isConnectable?: boolean;
}

// menuOptionHandleId MUST mirror the backend executor's branch convention
// (business/internal/flow/executor_menu.go menuHandle): a menu edge is matched by
// sourceHandle == "option-"+opt.id, falling back to "opt-"+1basedIndex when the
// option has no id. Keep these in lockstep — a mismatch sends every option to the
// fallback edge.
const menuOptionHandleId = (opt: MenuOption, index: number): string =>
  opt?.id ? `option-${opt.id}` : `opt-${index + 1}`;

const MenuNode: React.FC<MenuNodeProps> = ({ data, isConnectable }) => {
  const options = (data?.options as MenuOption[]) ?? [];
  const optionCount = options.length;

  // One source handle per option so the canvas can draw a distinct edge per
  // branch. Distribute them vertically along the right edge. When there are no
  // options yet, fall back to a single default handle (BaseNode's default) so a
  // freshly-dropped node is still connectable.
  const sourceHandles: HandleConfig[] | undefined =
    optionCount > 0
      ? options.map((opt, index) => ({
          id: menuOptionHandleId(opt, index),
          position: Position.Right,
          style: {
            top: `${((index + 1) / (optionCount + 1)) * 100}%`,
          },
        }))
      : undefined;

  return (
    <BaseNode
      data={data}
      icon={List}
      colorClass="colorMenu"
      defaultLabel="Menu"
      sublabel={optionCount > 0 ? `${optionCount} opções` : ''}
      isConnectable={isConnectable}
      sourceHandles={sourceHandles}
      badge={optionCount > 0 ? optionCount : null}
    />
  );
};

export default MenuNode;
