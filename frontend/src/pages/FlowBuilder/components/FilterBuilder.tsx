import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Filter {
  id: number;
  field: string;
  operator: string;
  value: string;
  logic?: 'AND' | 'OR';
}

interface FilterBuilderProps {
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
  tableName?: string;
  maxFilters?: number;
}

interface FieldConfig {
  value: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'select';
  options?: string[];
}

const TABLE_FIELDS: Record<string, FieldConfig[]> = {
  Contacts: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'number', label: 'Número', type: 'string' },
    { value: 'email', label: 'E-mail', type: 'string' },
    { value: 'isGroup', label: 'É Grupo', type: 'boolean' },
  ],
  Tickets: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'status', label: 'Status', type: 'select', options: ['open', 'pending', 'closed'] },
    { value: 'queueId', label: 'ID da Fila', type: 'number' },
    { value: 'userId', label: 'ID do Usuário', type: 'number' },
    { value: 'contactId', label: 'ID do Contato', type: 'number' },
    { value: 'isGroup', label: 'É Grupo', type: 'boolean' },
  ],
  Messages: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'body', label: 'Conteúdo', type: 'string' },
    { value: 'fromMe', label: 'Enviada por mim', type: 'boolean' },
    { value: 'mediaType', label: 'Tipo de Mídia', type: 'string' },
    { value: 'ticketId', label: 'ID do Ticket', type: 'number' },
  ],
  Users: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'email', label: 'E-mail', type: 'string' },
    { value: 'profile', label: 'Perfil', type: 'select', options: ['admin', 'user', 'super'] },
  ],
  Queues: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'color', label: 'Cor', type: 'string' },
  ],
  Whatsapps: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'status', label: 'Status', type: 'select', options: ['CONNECTED', 'DISCONNECTED', 'OPENING'] },
    { value: 'isDefault', label: 'É Padrão', type: 'boolean' },
  ],
  QuickAnswers: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'shortcut', label: 'Atalho', type: 'string' },
    { value: 'message', label: 'Mensagem', type: 'string' },
  ],
  Pipelines: [
    { value: 'id', label: 'ID', type: 'number' },
    { value: 'name', label: 'Nome', type: 'string' },
  ],
};

const FILTER_OPERATORS = [
  { value: '=', label: 'Igual a' },
  { value: '!=', label: 'Diferente de' },
  { value: '>', label: 'Maior que' },
  { value: '<', label: 'Menor que' },
  { value: '>=', label: 'Maior ou igual' },
  { value: '<=', label: 'Menor ou igual' },
  { value: 'like', label: 'Contém' },
];

const CONTEXT_VARIABLES = [
  { value: '{{contactId}}', label: 'ID do Contato' },
  { value: '{{ticketId}}', label: 'ID do Ticket' },
  { value: '{{userId}}', label: 'ID do Usuário' },
  { value: '{{queueId}}', label: 'ID da Fila' },
  { value: '{{lastInput}}', label: 'Última Mensagem' },
];

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  filters = [],
  onChange,
  tableName = '',
  maxFilters = 5,
}) => {
  const tableFields = TABLE_FIELDS[tableName] ?? [];

  const addFilter = () => {
    if (filters.length >= maxFilters) return;
    const defaultField = tableFields.length > 0 ? tableFields[0].value : 'id';
    onChange([...filters, { id: Date.now(), field: defaultField, operator: '=', value: '', logic: 'AND' }]);
  };

  const removeFilter = (id: number) => onChange(filters.filter((f) => f.id !== id));

  const updateFilter = (id: number, key: keyof Filter, value: string) => {
    onChange(filters.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const getFieldConfig = (fieldValue: string): FieldConfig | undefined =>
    tableFields.find((f) => f.value === fieldValue);

  const renderValueInput = (filter: Filter) => {
    const fieldConfig = getFieldConfig(filter.field);

    if (!fieldConfig || fieldConfig.type === 'string') {
      return (
        <Input
          className="flex-1 min-w-[100px] h-8 text-xs"
          placeholder="Valor"
          value={filter.value || ''}
          onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
        />
      );
    }

    if (fieldConfig.type === 'boolean') {
      return (
        <Select value={filter.value || ''} onValueChange={(v) => updateFilter(filter.id, 'value', v)}>
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
        <Select value={filter.value || ''} onValueChange={(v) => updateFilter(filter.id, 'value', v)}>
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

    if (fieldConfig.type === 'number') {
      return (
        <Select value={filter.value || ''} onValueChange={(v) => updateFilter(filter.id, 'value', v)}>
          <SelectTrigger className="flex-1 min-w-[100px] h-8 text-xs">
            <SelectValue placeholder="Valor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=""><em>Digitar valor...</em></SelectItem>
            {CONTEXT_VARIABLES.filter((v) => v.value.includes('Id')).map((v) => (
              <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
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
        onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
      />
    );
  };

  if (!tableName) {
    return <p className="text-xs text-muted-foreground">Selecione uma tabela primeiro</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground mb-2">Filtros (WHERE)</p>

      {filters.map((filter, index) => (
        <div key={filter.id} className="flex flex-wrap gap-1 items-center">
          {index > 0 && (
            <Select value={filter.logic ?? 'AND'} onValueChange={(v) => updateFilter(filter.id, 'logic', v)}>
              <SelectTrigger className="w-[70px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">E</SelectItem>
                <SelectItem value="OR">OU</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={filter.field || ''} onValueChange={(v) => updateFilter(filter.id, 'field', v)}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Campo" />
            </SelectTrigger>
            <SelectContent>
              {tableFields.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filter.operator || '='} onValueChange={(v) => updateFilter(filter.id, 'operator', v)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue placeholder="Op" />
            </SelectTrigger>
            <SelectContent>
              {FILTER_OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {renderValueInput(filter)}

          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeFilter(filter.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {filters.length < maxFilters && (
        <Button size="sm" variant="ghost" className="mt-1 h-7 text-xs gap-1" onClick={addFilter}>
          <Plus className="h-3 w-3" />
          Adicionar Filtro
        </Button>
      )}

      {/* Variáveis disponíveis */}
      <div className="mt-2 p-2 bg-muted/50 rounded-md">
        <p className="text-[10px] text-muted-foreground mb-1">Variáveis disponíveis:</p>
        <div className="flex flex-wrap gap-1">
          {CONTEXT_VARIABLES.map((v) => (
            <Badge
              key={v.value}
              variant="secondary"
              className="text-[10px] cursor-pointer hover:bg-primary hover:text-primary-foreground"
              onClick={() => navigator.clipboard.writeText(v.value)}
            >
              {v.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterBuilder;
