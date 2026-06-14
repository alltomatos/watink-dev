/* @jsxImportSource react */
import React, { useState, useContext, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  MoreVertical, 
  Edit, 
  Trash2, 
  RefreshCw, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  SignalHigh, 
  SignalLow,
  WifiOff,
  MessageSquare
} from "lucide-react";
import { toast } from "react-toastify";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import { useWhatsAppsQuery } from "../../hooks/useWhatsAppsQuery";
import { getBackendUrl } from "../../helpers/urlUtils";

import { 
  PageContainer, 
  PageHeader, 
  PageContent 
} from "../../components/ui/page-layout";
import { Button } from "../../components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter 
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "../../components/ui/dropdown-menu";
import { Avatar } from "../../components/ui/avatar";
import WhatsAppModal from "../../components/WhatsAppModal";
import WebchatModal from "../../components/WebchatModal";
import ConfirmationModal from "../../components/ConfirmationModal";

const Connections = () => {
  const navigate = useNavigate();
  const { data: whatsApps = [], isLoading, refetch: reloadWhatsApps } = useWhatsAppsQuery();

  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [webchatModalOpen, setWebchatModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);

  // Iniciar/reiniciar sessão usa o endpoint real do backend: /whatsappsession/:id
  const handleStartWhatsAppSession = async (whatsAppId) => {
    try {
      await api.post(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleRequestNewQrCode = async (whatsAppId) => {
    try {
      await api.put(`/whatsappsession/${whatsAppId}`);
    } catch (err) {
      toastError(err);
    }
  };

  // Desconectar: para a sessão sem excluir o registro da conexão
  const handleDisconnectSession = async (whatsAppId) => {
    try {
      await api.delete(`/whatsappsession/${whatsAppId}`);
      await reloadWhatsApps();
      toast.success(i18n.t("connections.toasts.disconnected"));
    } catch (err) {
      toastError(err);
    }
  };

  // Excluir: para a sessão (se ativa) e depois remove o registro
  const handleDeleteWhatsApp = async () => {
    const whatsApp = selectedWhatsApp;
    if (!whatsApp) return;
    try {
      if (whatsApp.status !== "DISCONNECTED" && whatsApp.status !== "TIMEOUT") {
        try {
          await api.delete(`/whatsappsession/${whatsApp.id}`);
        } catch (err) {
          console.warn("Could not stop session before deleting:", err);
        }
      }
      await api.delete(`/whatsapp/${whatsApp.id}`);
      await reloadWhatsApps();
      toast.warn(i18n.t("connections.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setConfirmModalOpen(false);
    setSelectedWhatsApp(null);
  };

  const handleEditWhatsApp = (whatsApp) => {
    setSelectedWhatsApp(whatsApp);
    if (whatsApp.type === "webchat") {
      setWebchatModalOpen(true);
    } else {
      setWhatsAppModalOpen(true);
    }
  };

  const handleCloseWhatsAppModal = () => {
    setWhatsAppModalOpen(false);
    setSelectedWhatsApp(null);
  };

  const handleCloseWebchatModal = () => {
    setWebchatModalOpen(false);
    setSelectedWhatsApp(null);
  };

  const STATUS_LABELS = {
    CONNECTED: "Conectado",
    DISCONNECTED: "Desconectado",
    QRCODE: "Escanear QR Code",
    PAIRING: "Pareando",
    OPENING: "Iniciando...",
    TIMEOUT: "Tempo Esgotado",
  };

  const renderStatus = (session) => {
    const label = STATUS_LABELS[session.status] || "Desconhecido";
    if (session.status === "CONNECTED") {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
          <CheckCircle2 size={12} className="mr-1" />
          {label}
        </Badge>
      );
    }
    if (session.status === "DISCONNECTED" || session.status === "TIMEOUT") {
      return (
        <Badge variant="destructive">
          <WifiOff size={12} className="mr-1" />
          {label}
        </Badge>
      );
    }
    if (session.status === "QRCODE") {
      return (
        <Badge variant="outline" className="border-amber-400 text-amber-600">
          <QrCode size={12} className="mr-1" />
          {label}
        </Badge>
      );
    }
    // PAIRING / OPENING e demais estados transitórios
    return (
      <Badge variant="outline" className="animate-pulse">
        {label}
      </Badge>
    );
  };

  const renderActionButtons = (whatsApp) => {
    return (
      <div className="flex gap-2">
        {(whatsApp.status === "DISCONNECTED" || whatsApp.status === "TIMEOUT") && (
          <Button
            size="sm"
            variant="default"
            onClick={() => handleStartWhatsAppSession(whatsApp.id)}
          >
            Conectar
          </Button>
        )}
        {whatsApp.status === "QRCODE" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/connections/${whatsApp.id}`)}
          >
            <QrCode size={14} className="mr-1" /> Ver QR Code
          </Button>
        )}
        {whatsApp.status === "CONNECTED" && (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => handleDisconnectSession(whatsApp.id)}
          >
            Desconectar
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/connections/${whatsApp.id}`)}>
              <QrCode className="mr-2 h-4 w-4" /> Configurar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRequestNewQrCode(whatsApp.id)}>
              <RefreshCw className="mr-2 h-4 w-4" /> Reiniciar Sessão
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditWhatsApp(whatsApp)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedWhatsApp(whatsApp);
                setConfirmModalOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <PageContainer>
      <WhatsAppModal
        open={whatsAppModalOpen}
        onClose={handleCloseWhatsAppModal}
        whatsAppId={selectedWhatsApp?.id}
        onSaved={reloadWhatsApps}
      />
      <WebchatModal
        open={webchatModalOpen}
        onClose={handleCloseWebchatModal}
        whatsAppId={selectedWhatsApp?.id}
        onSaved={reloadWhatsApps}
      />
      <ConfirmationModal
        title={i18n.t("connections.confirmationModal.deleteTitle")}
        open={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedWhatsApp(null);
        }}
        onConfirm={handleDeleteWhatsApp}
      >
        {i18n.t("connections.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <PageHeader 
        title={i18n.t("connections.title")}
        description="Gerencie seus canais de comunicação e conexões WhatsApp"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setSelectedWhatsApp(null); setWebchatModalOpen(true); }}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Configurar Webchat
          </Button>
          <Button onClick={() => { setSelectedWhatsApp(null); setWhatsAppModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Conexão
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whatsApps?.map((whatsApp) => (
            <Card key={whatsApp.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                  <Avatar size="lg" src={getBackendUrl(whatsApp.profilePicUrl)} name={whatsApp.name} />
                  <div>
                    <CardTitle className="text-lg">{whatsApp.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      {whatsApp.number ? `+${whatsApp.number}` : "Sem número"}
                    </CardDescription>
                  </div>
                </div>
                {renderStatus(whatsApp)}
              </CardHeader>
              <CardContent className="flex-1 py-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Última atualização:</span>
                    <span>{whatsApp.updatedAt ? format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm") : "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fila padrão:</span>
                    <span>{whatsApp.queue?.name || "Nenhuma"}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-border/50 pt-4 flex justify-between items-center">
                <div className="flex items-center gap-1">
                  {whatsApp.status === "CONNECTED" ? (
                    <SignalHigh size={18} className="text-green-500" />
                  ) : (
                    <WifiOff size={18} className="text-muted-foreground" />
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {whatsApp.type || "WHATSAPP"}
                  </span>
                </div>
                {renderActionButtons(whatsApp)}
              </CardFooter>
            </Card>
          ))}
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default Connections;
