import React from "react";
import * as Yup from "yup";
import { Formik, Form } from "formik";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { i18n } from "../../translate/i18n";
import { useWebchatModal } from "./hooks/useWebchatModal";
import GeneralTab from "./components/GeneralTab";
import AppearanceTab from "./components/AppearanceTab";
import IntegrationTab from "./components/IntegrationTab";
import { WebchatModalProps } from "./webchatModalTypes";

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
  const { whatsApp, selectedQueueIds, setSelectedQueueIds, handleSaveWhatsApp, handleClose } =
    useWebchatModal(open, whatsAppId, onClose, onSaved);

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
          {({ isSubmitting }) => (
            <Form className="space-y-4">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">Geral</TabsTrigger>
                  <TabsTrigger value="appearance">Personalização</TabsTrigger>
                  <TabsTrigger value="integration">Integração</TabsTrigger>
                </TabsList>

                <TabsContent value="general">
                  <GeneralTab
                    selectedQueueIds={selectedQueueIds}
                    onQueueChange={setSelectedQueueIds}
                  />
                </TabsContent>

                <TabsContent value="appearance">
                  <AppearanceTab />
                </TabsContent>

                <TabsContent value="integration">
                  <IntegrationTab whatsAppId={whatsAppId} />
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
