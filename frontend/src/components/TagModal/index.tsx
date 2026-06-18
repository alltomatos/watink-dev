/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form } from "formik";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { TAG_COLOR_OPTIONS } from "../../helpers/tagColors";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const TagSchema = Yup.object().shape({
  name: Yup.string()
    .min(3, "Muito curto!")
    .max(20, "Muito longo!")
    .required("Obrigatório"),
  color: Yup.string().required("Obrigatório"),
});

interface TagModalProps {
  open: boolean;
  onClose: () => void;
  tagId?: number | null;
}

const TagModal: React.FC<TagModalProps> = ({ open, onClose, tagId }) => {
  const initialState = {
    name: "",
    color: "blue",
  };

  const [tag, setTag] = useState(initialState);

  useEffect(() => {
    const fetchTag = async () => {
      if (!tagId) return;
      try {
        const { data } = await api.get(`/tags/${tagId}`);
        setTag(data);
      } catch (err) {
        toastError(err);
      }
    };
    if (open) {
      fetchTag();
    } else {
      setTag(initialState);
    }
    // initialState is a stable const defined outside; tagId+open are the real triggers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagId, open]);

  const handleSaveTag = async (values: typeof initialState) => {
    try {
      if (tagId) {
        await api.put(`/tags/${tagId}`, values);
        toast.success(i18n.t("tags.toasts.success"));
      } else {
        await api.post("/tags", values);
        toast.success(i18n.t("tags.toasts.success"));
      }
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {tagId ? "Editar Etiqueta" : "Nova Etiqueta"}
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={tag}
          enableReinitialize={true}
          validationSchema={TagSchema}
          onSubmit={async (values, actions) => {
            await handleSaveTag(values);
            actions.setSubmitting(false);
          }}
        >
          {({ values, touched, errors, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
            <Form className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{i18n.t("tags.form.name")}</Label>
                <Input
                  id="name"
                  name="name"
                  value={values.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="Nome da etiqueta"
                  className={touched.name && errors.name ? "border-destructive" : ""}
                />
                {touched.name && errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="color">{i18n.t("tags.form.color")}</Label>
                <Select 
                  value={values.color} 
                  onValueChange={(val) => setFieldValue("color", val)}
                >
                  <SelectTrigger id="color">
                    <SelectValue placeholder="Selecione uma cor" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAG_COLOR_OPTIONS.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full border border-black/10" 
                            style={{ backgroundColor: color }} 
                          />
                          <span className="capitalize">{color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {touched.color && errors.color && (
                  <p className="text-xs text-destructive">{errors.color}</p>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={onClose}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    i18n.t("tags.buttons.add")
                  )}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default TagModal;
