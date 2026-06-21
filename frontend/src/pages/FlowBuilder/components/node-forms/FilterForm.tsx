import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { NodeData, FilterCondition, FILTERABLE_FIELDS, FILTER_OPERATORS_NODE } from '../../nodeEditorTypes';

interface FilterFormProps {
  formData: NodeData;
  onChange: (field: string, value: unknown) => void;
}

const FilterForm: React.FC<FilterFormProps> = ({ formData, onChange }) => {
  const filterConditions: FilterCondition[] = (formData.filterConditions as FilterCondition[]) || [];

  const addCondition = () => {
    onChange('filterConditions', [
      ...filterConditions,
      { id: Date.now(), field: 'name', operator: 'contains', value: '' },
    ]);
  };

  const removeCondition = (id: number) => {
    onChange('filterConditions', filterConditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: number, key: string, value: string) => {
    onChange('filterConditions', filterConditions.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  };

  const needsValue = (operator: string) => !['isEmpty', 'isNotEmpty'].includes(operator);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Este nó recebe dados de uma variável, aplica filtros e entrega o resultado filtrado para o próximo nó.
      </p>

      <div className="space-y-1">
        <Label className="text-xs">Variável de entrada</Label>
        <Input
          className="h-8 text-xs"
          placeholder="dados"
          value={formData.inputVariable || ''}
          onChange={(e) => onChange('inputVariable', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
        />
        <p className="text-[10px] text-muted-foreground">Nome da variável que contém os dados</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium">Condições de Filtro</p>

        {filterConditions.map((condition, index) => (
          <div key={condition.id} className="flex flex-wrap gap-1 items-center">
            {index > 0 && (
              <Select value={condition.logic ?? 'AND'} onValueChange={(v) => updateCondition(condition.id, 'logic', v)}>
                <SelectTrigger className="w-[70px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">E</SelectItem>
                  <SelectItem value="OR">OU</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Select value={condition.field || 'name'} onValueChange={(v) => updateCondition(condition.id, 'field', v)}>
              <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FILTERABLE_FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={condition.operator || 'contains'} onValueChange={(v) => updateCondition(condition.id, 'operator', v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FILTER_OPERATORS_NODE.map((op) => (
                  <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {needsValue(condition.operator) && (
              <Input
                className="flex-1 min-w-[100px] h-8 text-xs"
                placeholder="Valor"
                value={condition.value || ''}
                onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
              />
            )}

            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeCondition(condition.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}

        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={addCondition}>
          <Plus className="h-3 w-3" /> Adicionar Condição
        </Button>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Variável de saída</Label>
        <Input
          className="h-8 text-xs"
          placeholder="filtrado"
          value={formData.outputVariable || ''}
          onChange={(e) => onChange('outputVariable', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
        />
      </div>
    </div>
  );
};

export default FilterForm;
