import React from "react";
import { Field, FieldProps, useFormikContext } from "formik";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { i18n } from "../../../translate/i18n";
import QueueSelect from "../../QueueSelect";
import { WhatsAppData } from "../webchatModalTypes";

interface GeneralTabProps {
  selectedQueueIds: number[];
  onQueueChange: (ids: number[]) => void;
}

const GeneralTab: React.FC<GeneralTabProps> = ({ selectedQueueIds, onQueueChange }) => {
  const { values, touched, errors, setFieldValue } = useFormikContext<WhatsAppData>();

  return (
    <div className="space-y-4 py-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="name">{i18n.t("whatsappModal.form.name")}</Label>
          <Field name="name">
            {({ field }: FieldProps) => (
              <Input
                {...field}
                id="name"
                autoFocus
                placeholder="Ex: Chat Site Oficial"
                className={touched.name && errors.name ? "border-destructive" : ""}
              />
            )}
          </Field>
          {touched.name && errors.name && (
            <p className="text-xs text-destructive">{errors.name as string}</p>
          )}
        </div>
        <div className="flex items-center space-x-2 pb-2">
          <Switch
            id="isDefault"
            checked={values.isDefault}
            onCheckedChange={(checked) => setFieldValue("isDefault", checked)}
          />
          <Label htmlFor="isDefault">{i18n.t("whatsappModal.form.isDefault")}</Label>
        </div>
      </div>

      <QueueSelect
        selectedQueueIds={selectedQueueIds}
        onChange={onQueueChange}
      />
    </div>
  );
};

export default GeneralTab;
