import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import FilterBuilder from '../FilterBuilder';
import DataBuilder from '../DataBuilder';
import { NodeData, TABLE_ALL_FIELDS } from '../../nodeEditorTypes';

const AVAILABLE_TABLES = ['Contacts', 'Tickets', 'Messages', 'Users', 'Queues', 'Whatsapps', 'QuickAnswers', 'Pipelines'];

interface DatabaseFormProps {
  formData: NodeData;
  onChange: (field: string, value: unknown) => void;
}

const DatabaseForm: React.FC<DatabaseFormProps> = ({ formData, onChange }) => {
  const tableFields = TABLE_ALL_FIELDS[formData.tableName || ''] || [];

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Operação</Label>
        <Select value={formData.operation || 'read'} onValueChange={(v) => onChange('operation', v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="read">READ - Buscar dados</SelectItem>
            <SelectItem value="update">UPDATE - Atualizar registro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Tabela</Label>
        <Select
          value={formData.tableName || ''}
          onValueChange={(v) => {
            onChange('tableName', v);
            onChange('filters', []);
            onChange('dataFields', []);
            onChange('selectedFields', []);
          }}
        >
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {AVAILABLE_TABLES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.tableName && (
        <FilterBuilder
          filters={formData.filters || []}
          onChange={(f) => onChange('filters', f)}
          tableName={formData.tableName}
        />
      )}

      {formData.operation === 'update' && formData.tableName && (
        <DataBuilder
          dataFields={formData.dataFields || []}
          onChange={(f) => onChange('dataFields', f)}
          tableName={formData.tableName}
        />
      )}

      {formData.operation === 'read' && formData.tableName && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Campos a retornar</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {tableFields.map((field) => (
              <div key={field} className="flex items-center gap-1">
                <Checkbox
                  id={`field-${field}`}
                  checked={(formData.selectedFields || []).includes(field)}
                  onCheckedChange={(checked) => {
                    const current = formData.selectedFields || [];
                    onChange('selectedFields', checked ? [...current, field] : current.filter((f) => f !== field));
                  }}
                />
                <Label htmlFor={`field-${field}`} className="text-xs cursor-pointer">{field}</Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {formData.operation === 'read' && formData.tableName && (
        <div className="flex gap-2">
          <div className="space-y-1 w-[90px]">
            <Label className="text-xs">Limite</Label>
            <Select value={String(formData.limit || 10)} onValueChange={(v) => onChange('limit', Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 5, 10, 25, 50].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 flex-1">
            <Label className="text-xs">Ordenar por</Label>
            <Select value={formData.orderByField || 'createdAt'} onValueChange={(v) => onChange('orderByField', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {tableFields.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 w-[80px]">
            <Label className="text-xs">Direção</Label>
            <Select value={formData.orderByDir || 'DESC'} onValueChange={(v) => onChange('orderByDir', v)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ASC">ASC ↑</SelectItem>
                <SelectItem value="DESC">DESC ↓</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Variável de saída</Label>
        <Input
          className="h-8 text-xs"
          placeholder="resultado"
          value={formData.outputVariable || ''}
          onChange={(e) => onChange('outputVariable', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
        />
        <p className="text-[10px] text-muted-foreground">Nome da variável (apenas letras, números e _)</p>
      </div>
    </div>
  );
};

export default DatabaseForm;
