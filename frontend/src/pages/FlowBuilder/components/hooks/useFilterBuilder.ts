import { Filter, FieldConfig, TABLE_FIELDS } from '../filterBuilderTypes';

interface UseFilterBuilderProps {
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
  tableName: string;
  maxFilters: number;
}

interface UseFilterBuilderReturn {
  tableFields: FieldConfig[];
  addFilter: () => void;
  removeFilter: (id: number) => void;
  updateFilter: (id: number, key: keyof Filter, value: string) => void;
  getFieldConfig: (fieldValue: string) => FieldConfig | undefined;
  canAddFilter: boolean;
}

export function useFilterBuilder({
  filters,
  onChange,
  tableName,
  maxFilters,
}: UseFilterBuilderProps): UseFilterBuilderReturn {
  const tableFields = TABLE_FIELDS[tableName] ?? [];

  const addFilter = () => {
    if (filters.length >= maxFilters) return;
    const defaultField = tableFields.length > 0 ? tableFields[0].value : 'id';
    onChange([
      ...filters,
      { id: Date.now(), field: defaultField, operator: '=', value: '', logic: 'AND' },
    ]);
  };

  const removeFilter = (id: number) => onChange(filters.filter((f) => f.id !== id));

  const updateFilter = (id: number, key: keyof Filter, value: string) => {
    onChange(filters.map((f) => (f.id === id ? { ...f, [key]: value } : f)));
  };

  const getFieldConfig = (fieldValue: string): FieldConfig | undefined =>
    tableFields.find((f) => f.value === fieldValue);

  return {
    tableFields,
    addFilter,
    removeFilter,
    updateFilter,
    getFieldConfig,
    canAddFilter: filters.length < maxFilters,
  };
}
