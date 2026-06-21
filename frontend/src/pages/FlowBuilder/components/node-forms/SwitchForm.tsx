import React from 'react';
import ConditionBuilder from '../ConditionBuilder';
import { NodeData } from '../../nodeEditorTypes';

interface SwitchFormProps {
  formData: NodeData;
  onChange: (field: string, value: unknown) => void;
}

const SwitchForm: React.FC<SwitchFormProps> = ({ formData, onChange }) => (
  <div className="space-y-3">
    <p className="text-xs text-muted-foreground">
      Configure quando seguir para a <strong>Opção A</strong> (verde). Caso contrário, seguirá para <strong>Opção B</strong> (vermelho).
    </p>
    <div className="space-y-1">
      <p className="text-xs font-medium">Condição para Opção A</p>
      <ConditionBuilder
        conditions={formData.conditionsA || []}
        onChange={(c) => onChange('conditionsA', c)}
        title=""
        maxConditions={3}
      />
    </div>
  </div>
);

export default SwitchForm;
