import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataField, FieldConfig } from './dataBuilderTypes';
import DataFieldValueInput from './DataFieldValueInput';

interface DataFieldRowProps {
  dataField: DataField;
  editableFields: FieldConfig[];
  fieldConfig: FieldConfig | undefined;
  onUpdate: (id: number, key: keyof DataField, value: string | boolean) => void;
  onRemove: (id: number) => void;
}

const DataFieldRow: React.FC<DataFieldRowProps> = ({
  dataField,
  editableFields,
  fieldConfig,
  onUpdate,
  onRemove,
}) => (
  <div className="flex gap-1 items-center">
    <Select
      value={dataField.field || ''}
      onValueChange={(v) => onUpdate(dataField.id, 'field', v)}
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

    <DataFieldValueInput dataField={dataField} fieldConfig={fieldConfig} onUpdate={onUpdate} />

    <div className="flex items-center gap-1">
      <Switch
        checked={dataField.useVariable}
        onCheckedChange={(checked) => onUpdate(dataField.id, 'useVariable', checked)}
        className="scale-75"
      />
      <Label className="text-[10px] text-muted-foreground">Var</Label>
    </div>

    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8 text-destructive hover:text-destructive"
      onClick={() => onRemove(dataField.id)}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  </div>
);

export default DataFieldRow;
