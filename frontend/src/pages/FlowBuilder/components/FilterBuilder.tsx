import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterBuilderProps } from './filterBuilderTypes';
import { useFilterBuilder } from './hooks/useFilterBuilder';
import FilterRow from './FilterRow';
import FilterContextVariables from './FilterContextVariables';

export type { Filter } from './filterBuilderTypes';

const FilterBuilder: React.FC<FilterBuilderProps> = ({
  filters = [],
  onChange,
  tableName = '',
  maxFilters = 5,
}) => {
  const { tableFields, addFilter, removeFilter, updateFilter, getFieldConfig, canAddFilter } =
    useFilterBuilder({ filters, onChange, tableName, maxFilters });

  if (!tableName) {
    return <p className="text-xs text-muted-foreground">Selecione uma tabela primeiro</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground mb-2">Filtros (WHERE)</p>

      {filters.map((filter, index) => (
        <FilterRow
          key={filter.id}
          filter={filter}
          index={index}
          tableFields={tableFields}
          getFieldConfig={getFieldConfig}
          onUpdate={updateFilter}
          onRemove={removeFilter}
        />
      ))}

      {canAddFilter && (
        <Button size="sm" variant="ghost" className="mt-1 h-7 text-xs gap-1" onClick={addFilter}>
          <Plus className="h-3 w-3" />
          Adicionar Filtro
        </Button>
      )}

      <FilterContextVariables />
    </div>
  );
};

export default FilterBuilder;
