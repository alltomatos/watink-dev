import React from "react";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { i18n } from "../../../translate/i18n";

interface GroupEditHeaderProps {
  isNew: boolean;
  saving: boolean;
  groupName: string;
  onBack: () => void;
}

const GroupEditHeader: React.FC<GroupEditHeaderProps> = ({
  isNew,
  saving,
  groupName,
  onBack,
}) => {
  return (
    <div
      className="mb-6 flex items-center justify-between rounded-2xl p-4 backdrop-blur"
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
            {isNew ? i18n.t("groupModal.title.add") : i18n.t("groupModal.title.edit")}
          </h1>
          {!isNew && (
            <p className="text-sm text-muted-foreground">{groupName}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={saving} className="rounded-xl">
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        {isNew ? i18n.t("groupModal.buttons.okAdd") : i18n.t("groupModal.buttons.okEdit")}
      </Button>
    </div>
  );
};

export default GroupEditHeader;
