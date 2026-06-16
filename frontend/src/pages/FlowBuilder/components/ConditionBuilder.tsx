import React, { useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Condition {
  id: number;
  field: string;
  operator: string;
  value: string;
  logic?: 'AND' | 'OR';
}

interface ConditionBuilderProps {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
  maxConditions?: number;
  title?: string;
  showLogic?: boolean;
}

const AVAILABLE_FIELDS = [
  { value: 'lastInput', label: 'Última Mensagem' },
  { value: 'contactName', label: 'Nome do Contato' },
  { value: 'contactNumber', label: 'Número do Contato' },
  { value: 'ticketStatus', label: 'Status do Ticket' },
  { value: 'queueName', label: 'Fila' },
  { value: 'tagName', label: 'Tag do Contato' },
  { value: 'dayOfWeek', label: 'Dia da Semana' },
  { value: 'currentHour', label: 'Hora Atual' },
];

const OPERATORS = [
  { value: 'equals', label: 'Igual a', needsValue: true },
  { value: 'notEquals', label: 'Diferente de', needsValue: true },
  { value: 'contains', label: 'Contém', needsValue: true },
  { value: 'notContains', label: 'Não contém', needsValue: true },
  { value: 'startsWith', label: 'Começa com', needsValue: true },
  { value: 'endsWith', label: 'Termina com', needsValue: true },
  { value: 'isEmpty', label: 'Está vazio', needsValue: false },
  { value: 'isNotEmpty', label: 'Não está vazio', needsValue: false },
  { value: 'greaterThan', label: 'Maior que', needsValue: true },
  { value: 'lessThan', label: 'Menor que', needsValue: true },
];

const PREDEFINED_VALUES: Record<string, { value: string; label: string }[]> = {
  ticketStatus: [
    { value: 'open', label: 'Aberto' },
    { value: 'pending', label: 'Pendente' },
    { value: 'closed', label: 'Fechado' },
  ],
  dayOfWeek: [
    { value: '0', label: 'Domingo' },
    { value: '1', label: 'Segunda' },
    { value: '2', label: 'Terça' },
    { value: '3', label: 'Quarta' },
    { value: '4', label: 'Quinta' },
    { value: '5', label: 'Sexta' },
    { value: '6', label: 'Sábado' },
  ],
};

const ConditionBuilder: React.FC<ConditionBuilderProps> = ({
  conditions = [],
  onChange,
  maxConditions = 5,
  title = 'Condições',
  showLogic = true,
}) => {
  useEffect(() => {
    if (conditions.length === 0) {
      onChange([{ id: Date.now(), field: 'lastInput', operator: 'isNotEmpty', value: '' }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCondition = () => {
    if (conditions.length >= maxConditions) return;
    onChange([
      ...conditions,
      { id: Date.now(), field: 'lastInput', operator: 'contains', value: '', logic: 'AND' },
    ]);
  };

  const removeCondition = (id: number) => {
    if (conditions.length <= 1) return;
    onChange(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: number, key: keyof Condition, value: string) => {
    onChange(conditions.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  };

  const operatorNeedsValue = (op: string) => OPERATORS.find((o) => o.value === op)?.needsValue ?? true;

  return (
    <div className="space-y-2">
      {title && <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>}

      {conditions.map((condition, index) => (
        <div key={condition.id} className="flex flex-wrap gap-1 items-center">
          {/* Logic selector */}
          {showLogic && index > 0 && (
            <Select
              value={condition.logic ?? 'AND'}
              onValueChange={(v) => updateCondition(condition.id, 'logic', v)}
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

          {/* Field selector */}
          <Select
            value={condition.field || 'lastInput'}
            onValueChange={(v) => updateCondition(condition.id, 'field', v)}
          >
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Campo" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Operator selector */}
          <Select
            value={condition.operator || 'equals'}
            onValueChange={(v) => updateCondition(condition.id, 'operator', v)}
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Operador" />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value input */}
          {operatorNeedsValue(condition.operator) && (
            PREDEFINED_VALUES[condition.field] ? (
              <Select
                value={condition.value || ''}
                onValueChange={(v) => updateCondition(condition.id, 'value', v)}
              >
                <SelectTrigger className="flex-1 min-w-[100px] h-8 text-xs">
                  <SelectValue placeholder="Valor" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_VALUES[condition.field].map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                className="flex-1 min-w-[100px] h-8 text-xs"
                placeholder="Valor"
                value={condition.value || ''}
                onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
              />
            )
          )}

          {/* Remove button */}
          {conditions.length > 1 && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => removeCondition(condition.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}

      {conditions.length < maxConditions && (
        <Button size="sm" variant="ghost" className="mt-1 h-7 text-xs gap-1" onClick={addCondition}>
          <Plus className="h-3 w-3" />
          Adicionar Condição
        </Button>
      )}
    </div>
  );
};

export default ConditionBuilder;
