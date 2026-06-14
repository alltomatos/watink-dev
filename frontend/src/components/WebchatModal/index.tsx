import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field, FieldProps } from "formik";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageSquare } from "lucide-react";

const DEFAULT_WEBCHAT_BUTTON_COLOR = "var(--whatsapp-brand, var(--status-success))";

const resolveDesignToken = (token: string): string => {
  if (typeof window === "undefined") return "#10B981";
  const rootStyles = window.getComputedStyle(document.documentElement);
  const tokenMatch = token.match(/var\((--[^,)]+)/);
  const value = tokenMatch ? rootStyles.getPropertyValue(tokenMatch[1]).trim() : token;
  return value || "#10B981";
};

interface ChatFields {
  name: boolean;
  email: boolean;
  phone: boolean;
}

interface ChatConfig {
  buttonColor: string;
  icon: string;
  position: string;
  title: string;
  subtitle: string;
  fields: ChatFields;
}

interface WhatsAppData {
  id?: number;
  name: string;
  isDefault: boolean;
  type: string;
  chatConfig: ChatConfig;
  queues?: { id: number }[];
}

interface WebchatModalProps {
  open: boolean;
  onClose: () => void;
  whatsAppId?: number;
  onSaved?: () => Promise<void>;
}

const SessionSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Muito curto!")
    .max(50, "Muito longo!")
    .required("Obrigatório"),
  chatConfig: Yup.object().shape({
    title: Yup.string().required("Obrigatório"),
    subtitle: Yup.string().required("Obrigatório"),
  }),
});

const WebchatModal: React.FC<WebchatModalProps> = ({ open, onClose, whatsAppId, onSaved }) => {
  const initialState: WhatsAppData = {
    name: "",
    isDefault: false,
    type: "webchat",
    chatConfig: {
      buttonColor: DEFAULT_WEBCHAT_BUTTON_COLOR,
      icon: "chat",
      position: "right",
      title: "Suporte Online",
      subtitle: "Fale conosco agora",
      fields: {
        name: true,
        email: true,
        phone: false
      }
    }
  };

  const [whatsApp, setWhatsApp] = useState<WhatsAppData>(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) {
        setWhatsApp(initialState);
        setSelectedQueueIds([]);
        return;
      }

      try {
        const { data } = await api.get(`whatsapp/${whatsAppId}`);
        if (!data.chatConfig) {
          data.chatConfig = initialState.chatConfig;
        }
        setWhatsApp(data);

        const whatsQueueIds = data.queues?.map((queue: { id: number }) => queue.id) || [];
        setSelectedQueueIds(whatsQueueIds);
      } catch (err) {
        toastError(err);
      }
    };

    if (open) {
      fetchSession();
    }
  }, [whatsAppId, open]);

  const handleSaveWhatsApp = async (values: WhatsAppData) => {
    const whatsappData = { ...values, queueIds: selectedQueueIds, type: "webchat" };

    try {
      if (whatsAppId) {
        await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
      } else {
        await api.post("/whatsapp", whatsappData);
      }
      toast.success(i18n.t("whatsappModal.success"));
      if (onSaved) {
        await onSaved();
      }
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleClose = () => {
    onClose();
    setWhatsApp(initialState);
    setSelectedQueueIds([]);
  };

  const renderEmbedCode = () => {
    if (!whatsAppId) return <p className="text-sm text-muted-foreground mt-4">Salve para gerar o código</p>;

    // @ts-ignore
    const backendUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin.replace('app', 'api').replace('3000', '8082');

    const script = `<script>
  window.watinkWebchatConfig = {
    url: "${backendUrl}",
    whatsappId: "${whatsAppId}"
  };
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = "${backendUrl}/public/webchat";
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'watink-webchat-sdk'));
</script>`;

    return (
      <div className="space-y-2 mt-4">
        <Label>Código de Incorporação (Embed):</Label>
        <Textarea
          readOnly
          value={script}
          rows={10}
          className="font-mono text-xs bg-muted"
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configurar Webchat</DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={whatsApp}
          enableReinitialize={true}
          validationSchema={SessionSchema}
          onSubmit={async (values, actions) => {
            await handleSaveWhatsApp(values);
            actions.setSubmitting(false);
          }}
        >
          {({ values, touched, errors, isSubmitting, setFieldValue }) => (
            <Form className="space-y-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">Geral</TabsTrigger>
                  <TabsTrigger value="appearance">Personalização</TabsTrigger>
                  <TabsTrigger value="integration">Integração</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4 py-4">
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
                    onChange={(ids) => setSelectedQueueIds(ids)}
                  />
                </TabsContent>

                <TabsContent value="appearance" className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="chatConfig.title">Título do Chat</Label>
                        <Field name="chatConfig.title">
                          {({ field }: FieldProps) => (
                            <Input {...field} id="chatConfig.title" />
                          )}
                        </Field>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="chatConfig.subtitle">Subtítulo</Label>
                        <Field name="chatConfig.subtitle">
                          {({ field }: FieldProps) => (
                            <Input {...field} id="chatConfig.subtitle" />
                          )}
                        </Field>
                      </div>
                      <div className="space-y-2">
                        <Label>Cor do Botão</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="color"
                            className="w-12 h-10 p-1 cursor-pointer"
                            value={resolveDesignToken(values.chatConfig?.buttonColor || DEFAULT_WEBCHAT_BUTTON_COLOR)}
                            onChange={(e) => setFieldValue("chatConfig.buttonColor", e.target.value)}
                          />
                          <span className="text-sm font-mono uppercase text-muted-foreground">
                            {resolveDesignToken(values.chatConfig?.buttonColor || DEFAULT_WEBCHAT_BUTTON_COLOR)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <Label className="mb-2">Prévia</Label>
                      <div className="flex-1 min-h-[180px] rounded-lg border border-dashed flex items-end justify-end p-6 bg-muted/30 relative overflow-hidden">
                        <div className="absolute top-2 left-2 text-[10px] text-muted-foreground uppercase tracking-widest">Preview Area</div>
                        <div
                          className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                          style={{ backgroundColor: resolveDesignToken(values.chatConfig?.buttonColor || DEFAULT_WEBCHAT_BUTTON_COLOR) }}
                        >
                          <MessageSquare className="w-7 h-7" />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="integration">
                  {renderEmbedCode()}
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose}>
                  {i18n.t("whatsappModal.buttons.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {whatsAppId
                    ? i18n.t("whatsappModal.buttons.okEdit")
                    : i18n.t("whatsappModal.buttons.okAdd")}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default WebchatModal;
