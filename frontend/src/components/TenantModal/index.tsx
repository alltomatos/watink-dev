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
import api from "../../services/api";
import toastError from "../../errors/toastError";

const TenantSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(50, "Too Long!").required("Required"),
});

interface TenantModalProps {
  open: boolean;
  onClose: () => void;
  tenantId?: number | string;
}

const initialState = { name: "", status: "active" };

const TenantModal = ({ open, onClose, tenantId }: TenantModalProps) => {
  const [tenant, setTenant] = useState(initialState);

  useEffect(() => {
    if (!tenantId) return;
    api.get(`/tenants/${tenantId}`)
      .then(({ data }) => setTenant((prev) => ({ ...prev, ...data })))
      .catch(toastError);
  }, [tenantId, open]);

  const handleClose = () => {
    onClose();
    setTenant(initialState);
  };

  const handleSave = async (values: typeof initialState) => {
    try {
      if (tenantId) {
        await api.put(`/tenants/${tenantId}`, values);
        toast.success("Tenant updated successfully!");
      } else {
        await api.post("/tenants", values);
        toast.success("Tenant created successfully!");
      }
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{tenantId ? "Edit Tenant" : "Add Tenant"}</DialogTitle>
        </DialogHeader>
        <Formik
          initialValues={tenant}
          enableReinitialize
          validationSchema={TenantSchema}
          onSubmit={(values, actions) => {
            handleSave(values);
            actions.setSubmitting(false);
          }}
        >
          {({ isSubmitting, errors, touched }) => (
            <Form className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="tenant-name">Nome</Label>
                <Field
                  as={Input}
                  id="tenant-name"
                  name="name"
                  autoFocus
                  aria-invalid={!!(errors.name && touched.name)}
                />
                {errors.name && touched.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default TenantModal;
