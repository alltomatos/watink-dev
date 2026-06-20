import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NodeData } from '../../nodeEditorTypes';

interface MenuFormProps {
  formData: NodeData;
  onChange: (field: string, value: unknown) => void;
}

const MenuForm: React.FC<MenuFormProps> = ({ formData, onChange }) => {
  const options = formData.options || [{ id: 'opt1', label: 'Opção 1' }];

  const addOption = () => {
    onChange('options', [...options, { id: `opt${Date.now()}`, label: `Opção ${options.length + 1}` }]);
  };

  const removeOption = (optId: string) =>
    onChange('options', options.filter((o) => o.id !== optId));

  const updateOption = (optId: string, newLabel: string) =>
    onChange('options', options.map((o) => (o.id === optId ? { ...o, label: newLabel } : o)));

  return (
    <div className="space-y-3">
      <Input
        className="h-8 text-xs"
        placeholder="Escolha uma opção:"
        value={formData.menuTitle || ''}
        onChange={(e) => onChange('menuTitle', e.target.value)}
      />
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Opções do Menu</p>
        {options.map((opt) => (
          <div key={opt.id} className="flex gap-1 items-center bg-muted/50 rounded p-1">
            <Input
              className="h-7 text-xs border-0 bg-transparent focus-visible:ring-0"
              value={opt.label}
              onChange={(e) => updateOption(opt.id, e.target.value)}
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => removeOption(opt.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={addOption}>
          <Plus className="h-3 w-3" /> Adicionar Opção
        </Button>
      </div>
    </div>
  );
};

export default MenuForm;
