import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, FieldConfig, CONTEXT_VARIABLES } from './filterBuilderTypes';

interface FilterValueInputProps {
  filter: Filter;
  fieldConfig: FieldConfig | undefined;
  onUpdate: (id: number, key: keyof Filter, value: string) => void;
}

const FilterValueInput: React.FC<FilterValueInputProps> = ({ filter, fieldConfig, onUpdate }) => {
  const handleChange = (value: string) => onUpdate(filter.id, 'value', value);

  if (!fieldConfig || fieldConfig.type === 'string') {
    return (
      <Input
        className="flex-1 min-w-[100px] h-8 text-xs"
        placeholder="Valor"
        value={filter.value || ''}
        onChange={(e) => handleChange(e.target.value)}
      />
    );
  }

  if (fieldConfig.type === 'boolean') {
    return (
      <Select value={filter.value || ''} onValueChange={handleChange}>
        <SelectTrigger className="flex-1 min-w-[100px] h-8 text-xs">
          <SelectValue placeholder="Valor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Sim</SelectItem>
          <SelectItem value="false">Não</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  if (fieldConfig.type === 'select' && fieldConfig.options) {
    return (
      <Select value={filter.value || ''} onValueChange={handleChange}>
        <SelectTrigger className="flex-1 min-w-[100px] h-8 text-xs">
          <SelectValue placeholder="Valor" />
        </SelectTrigger>
        <SelectContent>
          {fieldConfig.options.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (fieldConfig.type === 'number') {
    return (
      <Select
        value={filter.value || undefined}
        onValueChange={(v) => handleChange(v === '__custom__' ? '' : v)}
      >
        <SelectTrigger className="flex-1 min-w-[100px] h-8 text-xs">
          <SelectValue placeholder="Valor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__custom__">
            <em>Digitar valor...</em>
          </SelectItem>
          {CONTEXT_VARIABLES.filter((v) => v.value.includes('Id')).map((v) => (
            <SelectItem key={v.value} value={v.value}>
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      className="flex-1 min-w-[100px] h-8 text-xs"
      placeholder="Valor"
      value={filter.value || ''}
      onChange={(e) => handleChange(e.target.value)}
    />
  );
};

export default FilterValueInput;
