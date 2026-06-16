import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DataField {
  id: number;
  field: string;
  value: string;
  useVariable: boolean;
}

interface DataBuilderProps {
  dataFields: DataField[];
  onChange: (fields: DataField[]) => void;
  tableName?: string;
  maxFields?: number;
}

interface FieldConfig {
  value: string;
  label: string;
  type: 'string' | 'boolean' | 'select' | 'variable';
  options?: string[];
}

const EDITABLE_FIELDS: Record<string, FieldConfig[]> = {
  Contacts: [
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'email', label: 'E-mail', type: 'string' },
    { value: 'profilePicUrl', label: 'URL da Foto', type: 'string' },
  ],
  Tickets: [
    { value: 'status', label: 'Status', type: 'select', options: ['open', 'pending', 'closed'] },
    { value: 'queueId', label: 'ID da Fila', type: 'variable' },
    { value: 'userId', label: 'ID do Usuário', type: 'variable' },
  ],
  Messages: [
    { value: 'body', label: 'Conteúdo', type: 'string' },
    { value: 'read', label: 'Lida', type: 'boolean' },
  ],
  Users: [
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'email', label: 'E-mail', type: 'string' },
  ],
  Queues: [
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'color', label: 'Cor', type: 'string' },
  ],
  Whatsapps: [
    { value: 'name', label: 'Nome', type: 'string' },
    { value: 'isDefault', label: 'É Padrão', type: 'boolean' },
  ],
  QuickAnswers: [
    { value: 'shortcut', label: 'Atalho', type: 'string' },
    { value: 'message', label: 'Mensagem', type: 'string' },
  ],
  Pipelines: [{ value: 'name', label: 'Nome', type: 'string' }],
};

const CONTEXT_VARIABLES = [
  { value: '{{contactId}}', label: 'ID do Contato' },
  { value: '{{ticketId}}', label: 'ID do Ticket' },
  { value: '{{userId}}', label: 'ID do Usuário' },
  { value: '{{queueId}}', label: 'ID da Fila' },
  { value: '{{contactName}}', label: 'Nome do Contato' },
  { value: '{{lastInput}}', label: 'Última Mensagem' },
];

const DataBuilder: React.FC<DataBuilderProps> = ({
  dataFields = [],
  onChange,
  tableName = '',
  maxFields = 10,
}) => {
  const editableFields = EDITABLE_FIELDS[tableName] ?? [];

  const addField = () => {
    if (dataFields.length >= maxFields) return;
    const defaultField = editableFields.length > 0 ? editableFields[0].value : '';
    onChange([...dataFields, { id: Date.now(), field: defaultField, value: '', useVariable: false }]);
  };

  const removeField = (id: number) => onChange(dataFields.filter((f) => f.id !== id));

  const updateField = (id: number, key: keyof DataField, value: string | boolean) => {
    onChange(dataFields.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const getFieldConfig = (fieldValue: string): FieldConfig | undefined =>
    editableFields.find((f) => f.value === fieldValue);

  const renderValueInput = (dataField: DataField) => {
    const fieldConfig = getFieldConfig(dataField.field);

    if (dataField.useVariable) {
      return (
        <Select
          value={dataField.value || ''}
          onValueChange={(v) => updateField(dataField.id, 'value', v)}
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
          onChange={(e) => updateField(dataField.id, 'value', e.target.value)}
        />
      );
    }

    if (fieldConfig.type === 'boolean') {
      return (
        <Select
          value={dataField.value || ''}
          onValueChange={(v) => updateField(dataField.id, 'value', v)}
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
          onValueChange={(v) => updateField(dataField.id, 'value', v)}
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
          onValueChange={(v) => updateField(dataField.id, 'value', v)}
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
        onChange={(e) => updateField(dataField.id, 'value', e.target.value)}
      />
    );
  };

  if (!tableName) {
    return <p className="text-xs text-muted-foreground">Selecione uma tabela primeiro</p>;
  }

  if (editableFields.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum campo editável para esta tabela</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Dados a {dataFields.length > 0 ? 'salvar' : 'definir'}
      </p>

      {dataFields.map((dataField) => (
        <div key={dataField.id} className="flex gap-1 items-center">
          {/* Field selector */}
          <Select
            value={dataField.field || ''}
            onValueChange={(v) => updateField(dataField.id, 'field', v)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Campo" />
            </SelectTrigger>
            <SelectContent>
              {editableFields.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value input */}
          {renderValueInput(dataField)}

          {/* Toggle variável */}
          <div className="flex items-center gap-1">
            <Switch
              checked={dataField.useVariable}
              onCheckedChange={(checked) => updateField(dataField.id, 'useVariable', checked)}
              className="scale-75"
            />
            <Label className="text-[10px] text-muted-foreground">Var</Label>
          </div>

          {/* Remove */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeField(dataField.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}

      {dataFields.length < maxFields && (
        <Button size="sm" variant="ghost" className="mt-1 h-7 text-xs gap-1" onClick={addField}>
          <Plus className="h-3 w-3" />
          Adicionar Campo
        </Button>
      )}
    </div>
  );
};

export default DataBuilder;
