import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field, FieldArray } from "formik";
import { toast } from "react-toastify";
import { Loader2, Plus, Trash2 } from "lucide-react";

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

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const ContactSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(50, "Too Long!").required("Required"),
  number: Yup.string().min(8, "Too Short!").max(50, "Too Long!"),
  email: Yup.string().email("Invalid email"),
});

interface ExtraInfo {
  name: string;
  value: string;
}

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  contactId?: number | string;
  initialValues?: any;
  onSave?: (contact: any) => void;
}

const ContactModal = ({ open, onClose, contactId, initialValues, onSave }: ContactModalProps) => {
  const [contact, setContact] = useState<any>({ name: "", number: "", email: "", extraInfo: [] });

  useEffect(() => {
    if (initialValues) {
      setContact((prev: any) => ({ ...prev, ...initialValues }));
    }
    if (!contactId) return;
    api.get(`/contacts/${contactId}`)
      .then(({ data }) => setContact(data))
      .catch(toastError);
  }, [contactId, open, initialValues]);

  const handleClose = () => {
    onClose();
    setContact({ name: "", number: "", email: "", extraInfo: [] });
  };

  const handleSaveContact = async (values: any) => {
    try {
      if (contactId) {
        await api.put(`/contacts/${contactId}`, values);
      } else {
        const { data } = await api.post("/contacts", values);
        if (onSave) onSave(data);
      }
      toast.success(i18n.t("contactModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contactId ? i18n.t("contactModal.title.edit") : i18n.t("contactModal.title.add")}
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={contact}
          enableReinitialize
          validationSchema={ContactSchema}
          onSubmit={(values, actions) => {
            handleSaveContact(values);
            actions.setSubmitting(false);
          }}
        >
          {({ values, errors, touched, isSubmitting }) => (
            <Form className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>{i18n.t("contactModal.form.name")}</Label>
                  <Field as={Input} name="name" autoFocus aria-invalid={!!(errors.name && touched.name)} />
                  {errors.name && touched.name && <p className="text-xs text-destructive">{errors.name as string}</p>}
                </div>
                <div className="space-y-1">
                  <Label>{i18n.t("contactModal.form.number")}</Label>
                  <Field as={Input} name="number" placeholder="5513912344321" aria-invalid={!!(errors.number && touched.number)} />
                  {errors.number && touched.number && <p className="text-xs text-destructive">{errors.number as string}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <Label>{i18n.t("contactModal.form.email")}</Label>
                <Field as={Input} name="email" aria-invalid={!!(errors.email && touched.email)} />
                {errors.email && touched.email && <p className="text-xs text-destructive">{errors.email as string}</p>}
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-semibold mb-2">{i18n.t("contactModal.form.extraInfo")}</p>
                <FieldArray name="extraInfo">
                  {({ push, remove }) => (
                    <div className="space-y-2">
                      {values.extraInfo && values.extraInfo.length > 0 &&
                        values.extraInfo.map((info: ExtraInfo, index: number) => (
                          <div key={index} className="flex gap-2 items-start">
                            <Field as={Input} name={`extraInfo[${index}].name`} placeholder={i18n.t("contactModal.form.extraName")} className="flex-1" />
                            <Field as={Input} name={`extraInfo[${index}].value`} placeholder={i18n.t("contactModal.form.extraValue")} className="flex-1" />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => push({ name: "", value: "" })}
                      >
                        <Plus className="h-4 w-4 mr-1" /> {i18n.t("contactModal.buttons.addExtraInfo")}
                      </Button>
                    </div>
                  )}
                </FieldArray>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {i18n.t("contactModal.buttons.cancel")}
                </Button>
                {contactId && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await api.post(`/contacts/${contactId}/sync`);
                        toast.success("Sync scheduled!");
                      } catch (err) {
                        toastError(err);
                      }
                    }}
                  >
                    Sync
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {contactId ? i18n.t("contactModal.buttons.okEdit") : i18n.t("contactModal.buttons.okAdd")}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default ContactModal;
