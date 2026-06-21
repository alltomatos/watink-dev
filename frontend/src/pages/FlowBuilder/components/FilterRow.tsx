import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, FieldConfig, FILTER_OPERATORS } from './filterBuilderTypes';
import FilterValueInput from './FilterValueInput';

interface FilterRowProps {
  filter: Filter;
  index: number;
  tableFields: FieldConfig[];
  getFieldConfig: (fieldValue: string) => FieldConfig | undefined;
  onUpdate: (id: number, key: keyof Filter, value: string) => void;
  onRemove: (id: number) => void;
}

const FilterRow: React.FC<FilterRowProps> = ({
  filter,
  index,
  tableFields,
  getFieldConfig,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {index > 0 && (
        <Select
          value={filter.logic ?? 'AND'}
          onValueChange={(v) => onUpdate(filter.id, 'logic', v)}
        >
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">E</SelectItem>
            <SelectItem value="OR">OU</SelectItem>
          </SelectContent>
        </Select>
      )}

      <Select
        value={filter.field || ''}
        onValueChange={(v) => onUpdate(filter.id, 'field', v)}
      >
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue placeholder="Campo" />
        </SelectTrigger>
        <SelectContent>
          {tableFields.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filter.operator || '='}
        onValueChange={(v) => onUpdate(filter.id, 'operator', v)}
      >
        <SelectTrigger className="w-[100px] h-8 text-xs">
          <SelectValue placeholder="Op" />
        </SelectTrigger>
        <SelectContent>
          {FILTER_OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <FilterValueInput
        filter={filter}
        fieldConfig={getFieldConfig(filter.field)}
        onUpdate={onUpdate}
      />

      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onRemove(filter.id)}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export default FilterRow;
