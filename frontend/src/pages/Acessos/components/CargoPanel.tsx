import React, { useState, useEffect } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import { Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import CargoPermissionMatrix from "./CargoPermissionMatrix";
import type { CargoDetail, CargoSavePayload, PermissionsCatalog } from "../acessosTypes";

const CargoSchema = Yup.object().shape({
  name: Yup.string().min(2, "Nome muito curto!").max(120, "Nome muito longo!").required("Nome é obrigatório"),
  description: Yup.string().max(500, "Descrição muito longa!"),
});

interface CargoPanelProps {
  open: boolean;
  loading: boolean;
  editingCargo: CargoDetail | null;
  catalog: PermissionsCatalog;
  onClose: () => void;
  onSave: (id: number | null, payload: CargoSavePayload) => Promise<boolean>;
}

const CargoPanel: React.FC<CargoPanelProps> = ({
  open,
  loading,
  editingCargo,
  catalog,
  onClose,
  onSave,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedIds(editingCargo?.permissions?.map((p) => p.id) ?? []);
  }, [editingCargo]);

  const handleToggle = (permissionId: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, permissionId] : prev.filter((id) => id !== permissionId)
    );
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>{editingCargo ? "Editar Cargo" : "Novo Cargo"}</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Formik
            initialValues={{
              name: editingCargo?.name ?? "",
              description: editingCargo?.description ?? "",
            }}
            enableReinitialize
            validationSchema={CargoSchema}
            onSubmit={async (values, actions) => {
              const ok = await onSave(editingCargo?.id ?? null, {
                name: values.name,
                description: values.description,
                permissionIds: selectedIds,
              });
              actions.setSubmitting(false);
              if (!ok) return;
            }}
          >
            {({ touched, errors, isSubmitting }) => (
              <Form className="mt-4 flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cargo-name">Nome</Label>
                  <Field
                    as={Input}
                    id="cargo-name"
                    name="name"
                    autoFocus
                    className={touched.name && errors.name ? "border-destructive" : ""}
                  />
                  {touched.name && errors.name && (
                    <p className="text-xs text-destructive">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cargo-description">Descrição</Label>
                  <Field
                    as={Textarea}
                    id="cargo-description"
                    name="description"
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Permissões</Label>
                  <CargoPermissionMatrix
                    catalog={catalog}
                    selectedIds={selectedIds}
                    onToggle={handleToggle}
                  />
                </div>

                <SheetFooter className="mt-2 gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </SheetFooter>
              </Form>
            )}
          </Formik>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CargoPanel;
