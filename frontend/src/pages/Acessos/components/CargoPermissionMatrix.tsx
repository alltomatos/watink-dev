import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { PermissionsCatalog } from "../acessosTypes";

interface CargoPermissionMatrixProps {
  catalog: PermissionsCatalog;
  selectedIds: number[];
  onToggle: (permissionId: number, checked: boolean) => void;
}

/**
 * Matriz recurso×ação: uma linha por resource (catálogo global agrupado pelo
 * backend em ListPermissionsCatalog), um checkbox por action dentro da linha.
 * Não reusa PermissionTransferList (id: string, lista simples) — o catálogo
 * real é agrupado por resource com id numérico, formato melhor representado
 * como matriz do que como duas listas.
 */
const CargoPermissionMatrix: React.FC<CargoPermissionMatrixProps> = ({
  catalog,
  selectedIds,
  onToggle,
}) => {
  const resources = Object.keys(catalog).sort();

  if (resources.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Catálogo de permissões indisponível.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {resources.map((resource) => {
        const perms = catalog[resource];
        const selectedInResource = perms.filter((p) => selectedIds.includes(p.id)).length;
        return (
          <div
            key={resource}
            className="rounded-2xl bg-card p-4 shadow-[0px_4px_20px_rgba(0,0,0,0.08)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold capitalize">{resource}</span>
              <Badge variant="outline" className="text-xs">
                {selectedInResource}/{perms.length}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {perms.map((perm) => (
                <label
                  key={perm.id}
                  className="flex cursor-pointer items-start gap-2 rounded-md p-2 hover:bg-muted/50 transition-colors"
                  title={perm.description}
                >
                  <Checkbox
                    checked={selectedIds.includes(perm.id)}
                    onCheckedChange={(checked) => onToggle(perm.id, !!checked)}
                  />
                  <span className="text-sm leading-tight pt-0.5">{perm.action}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CargoPermissionMatrix;
