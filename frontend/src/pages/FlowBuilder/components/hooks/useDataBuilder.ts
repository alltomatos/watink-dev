import { DataField, FieldConfig, EDITABLE_FIELDS } from '../dataBuilderTypes';

interface UseDataBuilderParams {
  dataFields: DataField[];
  onChange: (fields: DataField[]) => void;
  tableName: string;
  maxFields: number;
}

interface UseDataBuilderReturn {
  editableFields: FieldConfig[];
  addField: () => void;
  removeField: (id: number) => void;
  updateField: (id: number, key: keyof DataField, value: string | boolean) => void;
  getFieldConfig: (fieldValue: string) => FieldConfig | undefined;
}

export function useDataBuilder({
  dataFields,
  onChange,
  tableName,
  maxFields,
}: UseDataBuilderParams): UseDataBuilderReturn {
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

  return { editableFields, addField, removeField, updateField, getFieldConfig };
}
