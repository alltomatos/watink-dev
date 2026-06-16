import React, { useState, useEffect, useRef } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { Loader2, HelpCircle, RefreshCw, Users, Briefcase } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { Queue } from "../../types/domain";

const QueueSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(50, "Too Long!").required("Required"),
  color: Yup.string().min(3, "Too Short!").max(9, "Too Long!").required("Required"),
  greetingMessage: Yup.string(),
  distributionStrategy: Yup.string().required("Required"),
  prioritizeWallet: Yup.boolean()
});

const STRATEGY_OPTIONS = [
  {
    value: "ROUND_ROBIN",
    label: "Round Robin (Rotatividade)",
    description: "Distribui tickets igualmente entre os atendentes da fila em ordem sequencial",
    icon: <RefreshCw className="h-5 w-5 text-blue-500" />
  },
  {
    value: "RANDOM",
    label: "Aleatório Equilibrado",
    description: "Sorteia atendentes, priorizando quem atendeu menos recentemente",
    icon: <Users className="h-5 w-5 text-green-500" />
  },
  {
    value: "LEAST_TICKETS",
    label: "Menor Volume Atual",
    description: "Envia o ticket para o atendente com menos tickets em andamento",
    icon: <Briefcase className="h-5 w-5 text-orange-500" />
  }
];

interface QueueModalProps {
  open: boolean;
  onClose: () => void;
  queueId?: number | string;
}

const QueueModal = ({ open, onClose, queueId }: QueueModalProps) => {
  const isMounted = useRef(true);
  const [queue, setQueue] = useState<Queue>({
    name: "",
    color: "var(--color-primary)", // default primary color
    greetingMessage: "",
    distributionStrategy: "ROUND_ROBIN",
    prioritizeWallet: false
  });

  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  useEffect(() => {
    if (!queueId) return;
    api.get(`/queue/${queueId}`)
      .then(({ data }) => { if (isMounted.current) setQueue(data); })
      .catch(toastError);
  }, [queueId, open]);

  const handleClose = () => {
    onClose();
    setQueue({ name: "", color: "var(--color-primary)", greetingMessage: "", distributionStrategy: "ROUND_ROBIN", prioritizeWallet: false });
  };

  const handleSave = async (values: Queue) => {
    try {
      if (queueId) {
        await api.put(`/queue/${queueId}`, values);
      } else {
        await api.post("/queue", values);
      }
      toast.success("Fila salva com sucesso!");
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{queueId ? i18n.t("queueModal.title.edit") : i18n.t("queueModal.title.add")}</DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={queue}
          enableReinitialize
          validationSchema={QueueSchema}
          onSubmit={(values, actions) => {
            handleSave(values);
            actions.setSubmitting(false);
          }}
        >
          {({ values, errors, touched, isSubmitting, setFieldValue }) => (
            <Form className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Informações Básicas</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2 space-y-1">
                    <Label htmlFor="queue-name">{i18n.t("queueModal.form.name")}</Label>
                    <Field as={Input} id="queue-name" name="name" autoFocus aria-invalid={!!(errors.name && touched.name)} />
                    {errors.name && touched.name && <p className="text-xs text-destructive">{errors.name as string}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="queue-color">{i18n.t("queueModal.form.color")}</Label>
                    <div className="flex gap-2">
                      <Field type="color" name="color" className="h-9 w-12 rounded cursor-pointer border" />
                      <Field as={Input} name="color" className="flex-1 font-mono uppercase" />
                    </div>
                    {errors.color && touched.color && <p className="text-xs text-destructive">{errors.color as string}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="queue-greeting">{i18n.t("queueModal.form.greetingMessage")}</Label>
                  <Field
                    as="textarea"
                    id="queue-greeting"
                    name="greetingMessage"
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                </div>
              </div>

              {/* Roteamento e Distribuição */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Roteamento e Distribuição</h3>

                <div className="space-y-2 p-4 bg-muted/30 rounded-lg border">
                  <Label>Estratégia de Distribuição</Label>
                  <Select value={values.distributionStrategy} onValueChange={(val) => setFieldValue("distributionStrategy", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a estratégia" />
                    </SelectTrigger>
                    <SelectContent>
                      {STRATEGY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            {opt.icon}
                            <div>
                              <div className="font-medium">{opt.label}</div>
                              <div className="text-xs text-muted-foreground">{opt.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border">
                  <div className="mt-1">
                    <Switch
                      checked={values.prioritizeWallet}
                      onCheckedChange={(val) => setFieldValue("prioritizeWallet", val)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-base">Priorizar Carteira (Wallet)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          Quando ativo, o sistema verifica se o contato tem um agente dono da carteira atribuído. Se este agente estiver online, o ticket vai direto para ele.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Tickets são direcionados preferencialmente ao dono da carteira do contato, ignorando a estratégia acima se o agente estiver disponível.
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  {i18n.t("queueModal.buttons.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {queueId ? i18n.t("queueModal.buttons.okEdit") : i18n.t("queueModal.buttons.okAdd")}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default QueueModal;
