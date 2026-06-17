import React, { useState, useEffect, useRef } from "react";
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
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

const QuickAnswerSchema = Yup.object().shape({
  shortcut: Yup.string().min(2).max(15).required("Required"),
  message: Yup.string().min(8).max(30000).required("Required"),
});

interface QuickAnswerValues {
  shortcut: string;
  message: string;
}

interface QuickAnswersModalProps {
  open: boolean;
  onClose: () => void;
  quickAnswerId?: number | string;
  initialValues?: Partial<QuickAnswerValues>;
  onSave?: (values: QuickAnswerValues) => void;
}

const QuickAnswersModal = ({ open, onClose, quickAnswerId, initialValues, onSave }: QuickAnswersModalProps) => {
  const isMounted = useRef(true);
  const [quickAnswer, setQuickAnswer] = useState<QuickAnswerValues>({ shortcut: "", message: "" });

  useEffect(() => () => { isMounted.current = false; }, []);

  useEffect(() => {
    if (initialValues) {
      setQuickAnswer((prev) => ({ ...prev, ...initialValues }));
      return;
    }
    if (!quickAnswerId) return;
    api.get(`/quickAnswers/${quickAnswerId}`)
      .then(({ data }) => { if (isMounted.current) setQuickAnswer(data); })
      .catch(toastError);
  }, [quickAnswerId, initialValues, open]);

  const handleClose = () => {
    onClose();
    setQuickAnswer({ shortcut: "", message: "" });
  };

  const handleSave = async (values: QuickAnswerValues) => {
    try {
      if (quickAnswerId) {
        await api.put(`/quickAnswers/${quickAnswerId}`, values);
      } else {
        await api.post("/quickAnswers", values);
      }
      onSave?.(values);
      toast.success(i18n.t("quickAnswersModal.success"));
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
            {quickAnswerId
              ? i18n.t("quickAnswersModal.title.edit")
              : i18n.t("quickAnswersModal.title.add")}
          </DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={quickAnswer}
          enableReinitialize
          validationSchema={QuickAnswerSchema}
          onSubmit={(values, actions) => {
            handleSave(values);
            actions.setSubmitting(false);
          }}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="qa-shortcut">{i18n.t("quickAnswersModal.form.shortcut")}</Label>
                <Field
                  as={Input}
                  id="qa-shortcut"
                  name="shortcut"
                  autoFocus
                  aria-invalid={!!(errors.shortcut && touched.shortcut)}
                />
                {errors.shortcut && touched.shortcut && (
                  <p className="text-xs text-destructive">{errors.shortcut}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="qa-message">{i18n.t("quickAnswersModal.form.message")}</Label>
                <Field
                  as="textarea"
                  id="qa-message"
                  name="message"
                  rows={5}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  aria-invalid={!!(errors.message && touched.message)}
                />
                {errors.message && touched.message && (
                  <p className="text-xs text-destructive">{errors.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  {i18n.t("quickAnswersModal.buttons.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {i18n.t("quickAnswersModal.buttons.okAdd")}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAnswersModal;
