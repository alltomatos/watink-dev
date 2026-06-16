import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import type { WhatsAppConnection, WhatsAppFormValues } from "../../types/domain";

const SessionSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(50, "Too Long!").required("Required"),
});

interface WhatsAppModalProps {
  open: boolean;
  onClose: () => void;
  whatsAppId?: number | string;
  onSaved?: () => void; // Adicionado onSaved que é passado nos consumers (ex: Connections)
}

const WhatsAppModal = ({ open, onClose, whatsAppId, onSaved }: WhatsAppModalProps) => {
  const [whatsApp, setWhatsApp] = useState<WhatsAppFormValues>({
    name: "",
    isDefault: false,
    keepAlive: false,
    syncHistory: false,
  });
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);

  useEffect(() => {
    if (!whatsAppId) return;
    api.get<WhatsAppConnection>(`/whatsapp/${whatsAppId}`)
      .then(({ data }) => {
        setWhatsApp({
          name: data.name,
          isDefault: data.isDefault,
          keepAlive: data.keepAlive,
          syncHistory: data.syncHistory,
        });
        if (data.queues) {
          setSelectedQueueIds(data.queues.map((q) => q.id));
        }
      })
      .catch(toastError);
  }, [whatsAppId, open]);

  const handleClose = () => {
    onClose();
    setWhatsApp({ name: "", isDefault: false, keepAlive: false, syncHistory: false });
    setSelectedQueueIds([]);
  };

  const handleSaveWhatsApp = async (values: WhatsAppFormValues) => {
    const payload = { ...values, queueIds: selectedQueueIds };
    try {
      if (whatsAppId) {
        await api.put(`/whatsapp/${whatsAppId}`, payload);
      } else {
        await api.post("/whatsapp", payload);
      }
      toast.success(i18n.t("whatsappModal.success"));
      if (onSaved) onSaved(); // Chamar callback se existir
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {whatsAppId ? i18n.t("whatsappModal.title.edit") : i18n.t("whatsappModal.title.add")}
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={whatsApp}
          enableReinitialize
          validationSchema={SessionSchema}
          onSubmit={(values, actions) => {
            handleSaveWhatsApp(values);
            actions.setSubmitting(false);
          }}
        >
          {({ values, touched, errors, isSubmitting, setFieldValue }) => (
            <Form className="space-y-4">
              <div className="space-y-1">
                <Label>{i18n.t("whatsappModal.form.name")}</Label>
                <Field as={Input} name="name" autoFocus aria-invalid={!!(errors.name && touched.name)} />
                {errors.name && touched.name && <p className="text-xs text-destructive">{errors.name as string}</p>}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="wa-default"
                  checked={values.isDefault}
                  onCheckedChange={(checked) => setFieldValue("isDefault", checked)}
                />
                <Label htmlFor="wa-default">{i18n.t("whatsappModal.form.default")}</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="wa-keep-alive"
                  checked={values.keepAlive}
                  onCheckedChange={(checked) => setFieldValue("keepAlive", checked)}
                />
                <Label htmlFor="wa-keep-alive">Keep Alive</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="wa-sync"
                  checked={values.syncHistory}
                  onCheckedChange={(checked) => setFieldValue("syncHistory", checked)}
                />
                <Label htmlFor="wa-sync">Sincronizar Histórico</Label>
              </div>

              <div className="pt-2">
                <Label className="mb-2 block">Filas Permitidas</Label>
                <QueueSelect
                  selectedQueueIds={selectedQueueIds}
                  onChange={setSelectedQueueIds}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {i18n.t("whatsappModal.buttons.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {whatsAppId ? i18n.t("whatsappModal.buttons.okEdit") : i18n.t("whatsappModal.buttons.okAdd")}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsAppModal;
