import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataField, FieldConfig, CONTEXT_VARIABLES } from './dataBuilderTypes';

interface DataFieldValueInputProps {
  dataField: DataField;
  fieldConfig: FieldConfig | undefined;
  onUpdate: (id: number, key: keyof DataField, value: string | boolean) => void;
}

const DataFieldValueInput: React.FC<DataFieldValueInputProps> = ({
  dataField,
  fieldConfig,
  onUpdate,
}) => {
  if (dataField.useVariable) {
    return (
      <Select
        value={dataField.value || ''}
        onValueChange={(v) => onUpdate(dataField.id, 'value', v)}
      >
        <SelectTrigger className="flex-1 min-w-[120px] h-8 text-xs">
          <SelectValue placeholder="Variável" />
        </SelectTrigger>
        <SelectContent>
          {CONTEXT_VARIABLES.map((v) => (
            <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (!fieldConfig || fieldConfig.type === 'string') {
    return (
      <Input
        className="flex-1 min-w-[120px] h-8 text-xs"
        placeholder="Valor"
        value={dataField.value || ''}
        onChange={(e) => onUpdate(dataField.id, 'value', e.target.value)}
      />
    );
  }

  if (fieldConfig.type === 'boolean') {
    return (
      <Select
        value={dataField.value || ''}
        onValueChange={(v) => onUpdate(dataField.id, 'value', v)}
      >
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
      <Select
        value={dataField.value || ''}
        onValueChange={(v) => onUpdate(dataField.id, 'value', v)}
      >
        <SelectTrigger className="flex-1 min-w-[100px] h-8 text-xs">
          <SelectValue placeholder="Valor" />
        </SelectTrigger>
        <SelectContent>
          {fieldConfig.options.map((opt) => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (fieldConfig.type === 'variable') {
    return (
      <Select
        value={dataField.value || ''}
        onValueChange={(v) => onUpdate(dataField.id, 'value', v)}
      >
        <SelectTrigger className="flex-1 min-w-[100px] h-8 text-xs">
          <SelectValue placeholder="Valor" />
        </SelectTrigger>
        <SelectContent>
          {CONTEXT_VARIABLES.filter((v) => v.value.includes('Id')).map((v) => (
            <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      className="flex-1 min-w-[120px] h-8 text-xs"
      placeholder="Valor"
      value={dataField.value || ''}
      onChange={(e) => onUpdate(dataField.id, 'value', e.target.value)}
    />
  );
};

export default DataFieldValueInput;
