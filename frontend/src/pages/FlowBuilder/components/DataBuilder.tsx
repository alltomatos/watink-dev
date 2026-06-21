import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataBuilderProps } from './dataBuilderTypes';
import { useDataBuilder } from './hooks/useDataBuilder';
import DataFieldRow from './DataFieldRow';

export type { DataField } from './dataBuilderTypes';

const DataBuilder: React.FC<DataBuilderProps> = ({
  dataFields = [],
  onChange,
  tableName = '',
  maxFields = 10,
}) => {
  const { editableFields, addField, removeField, updateField, getFieldConfig } = useDataBuilder({
    dataFields,
    onChange,
    tableName,
    maxFields,
  });

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
        <DataFieldRow
          key={dataField.id}
          dataField={dataField}
          editableFields={editableFields}
          fieldConfig={getFieldConfig(dataField.field)}
          onUpdate={updateField}
          onRemove={removeField}
        />
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
