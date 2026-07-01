import React, { useState, useEffect } from "react";
import { Save, Network } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueues } from "@/hooks/useQueues";
import type { SetorQueueLink } from "../acessosTypes";

interface SetorQueuesSectionProps {
  linkedQueues: SetorQueueLink[];
  onSave: (queueIds: number[]) => Promise<void>;
}

const SetorQueuesSection: React.FC<SetorQueuesSectionProps> = ({ linkedQueues, onSave }) => {
  const { data: queues = [], isLoading } = useQueues();
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelected(linkedQueues.map((q) => q.queueId));
  }, [linkedQueues]);

  const toggle = (queueId: number, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, queueId] : prev.filter((id) => id !== queueId)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando filas...</p>
      ) : queues.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma fila cadastrada.</p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          {queues.map((q) => (
            <label
              key={q.id}
              className="flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(q.id)}
                onCheckedChange={(v) => toggle(q.id, !!v)}
              />
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: q.color }}
              />
              <span className="truncate">{q.name}</span>
            </label>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleSave}
        disabled={saving || isLoading}
      >
        <Save className="mr-2 h-3.5 w-3.5" />
        Salvar filas do setor
      </Button>
      {queues.length === 0 && !isLoading && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Network className="h-3 w-3" /> Cadastre filas em Configurações → Filas
        </p>
      )}
    </div>
  );
};

export default SetorQueuesSection;
