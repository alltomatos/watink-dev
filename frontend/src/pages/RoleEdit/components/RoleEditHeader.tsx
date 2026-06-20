import React from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { i18n } from "../../../translate/i18n";

interface RoleEditHeaderProps {
  isNew: boolean;
  saving: boolean;
  roleName: string;
  onBack: () => void;
}

export const RoleEditHeader: React.FC<RoleEditHeaderProps> = ({
  isNew,
  saving,
  roleName,
  onBack,
}) => {
  return (
    <div
      className="flex items-center justify-between rounded-2xl p-4 backdrop-blur"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent) 0%, color-mix(in srgb, var(--secondary) 6%, transparent) 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-xl shadow-sm"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">
            {isNew
              ? i18n.t("role.formTitle.add") || "Adicionar Função"
              : i18n.t("role.formTitle.edit") || "Editar Função"}
          </h1>
          {!isNew && (
            <p className="text-sm text-muted-foreground">{roleName}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={saving} className="rounded-xl">
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {i18n.t("common.save") || "Salvar"}
      </Button>
    </div>
  );
};
