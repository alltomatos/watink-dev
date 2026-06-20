import React from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, MessageSquare, Edit2, PlugZap, RefreshCw, QrCode, Trash2 } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { PageLayout, PageHeader, PageContent } from "../../components/ui/page-layout";

import ConfirmationModal from "../../components/ConfirmationModal";
import WhatsAppModal from "../../components/WhatsAppModal";
import PairingCodeModal from "../../components/PairingCodeModal";
import { i18n } from "../../translate/i18n";

import { useConnectionConfig } from "./hooks/useConnectionConfig";
import ActionCard from "./components/ActionCard";
import ConnectionStatusBanner from "./components/ConnectionStatusBanner";
import IdentityCard from "./components/IdentityCard";
import PairingCodePanel from "./components/PairingCodePanel";
import PhoneInputDialog from "./components/PhoneInputDialog";
import QrCodePanel from "./components/QrCodePanel";
import SessionDetailsCard from "./components/SessionDetailsCard";

const ConnectionConfig = () => {
  const navigate = useNavigate();
  const {
    whatsappId,
    whatsapp,
    loading,
    stats,
    keepAliveSaving,
    status,
    isConnected,
    isBusy,
    connecting,
    restarting,
    pairingModalOpen,
    setPairingModalOpen,
    whatsappModalOpen,
    setWhatsAppModalOpen,
    confirmationOpen,
    setConfirmationOpen,
    confirmationAction,
    setConfirmationAction,
    phoneNumber,
    setPhoneNumber,
    pairingCode,
    pairingLoading,
    showPairingInput,
    showQrCode,
    inputPairingModalOpen,
    setInputPairingModalOpen,
    fetchWhatsapp,
    handleStartSessionQr,
    handleRestart,
    handleRequestPairingCode,
    handleDisconnect,
    handleDelete,
    handleToggleKeepAlive,
    handleCancelPairing,
  } = useConnectionConfig();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!whatsapp) return null;

  const statusBadge = isConnected ? (
    <Badge variant="secondary" className="bg-green-100 text-green-700 border-none gap-1">
      <span className="h-2 w-2 rounded-full bg-green-500" /> Conectado
    </Badge>
  ) : status === "QRCODE" ? (
    <Badge variant="outline" className="border-amber-400 text-amber-600">
      Escanear QR Code
    </Badge>
  ) : isBusy ? (
    <Badge variant="outline" className="animate-pulse">
      Iniciando...
    </Badge>
  ) : (
    <Badge variant="destructive">Desconectado</Badge>
  );

  return (
    <PageLayout>
      <ConfirmationModal
        title={
          confirmationAction === "disconnect"
            ? i18n.t("connections.confirmationModal.disconnectTitle")
            : i18n.t("connections.confirmationModal.deleteTitle")
        }
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={confirmationAction === "disconnect" ? handleDisconnect : handleDelete}
      >
        {confirmationAction === "disconnect"
          ? i18n.t("connections.confirmationModal.disconnectMessage")
          : i18n.t("connections.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <WhatsAppModal
        open={whatsappModalOpen}
        onClose={() => {
          setWhatsAppModalOpen(false);
          void fetchWhatsapp();
        }}
        whatsAppId={whatsappId}
      />

      <PairingCodeModal
        open={pairingModalOpen}
        onClose={() => setPairingModalOpen(false)}
        whatsAppId={parseInt(whatsappId ?? "0")}
      />

      <PhoneInputDialog
        open={inputPairingModalOpen}
        onOpenChange={setInputPairingModalOpen}
        phoneNumber={phoneNumber}
        onPhoneNumberChange={setPhoneNumber}
        onConfirm={handleRequestPairingCode}
        pairingLoading={pairingLoading}
      />

      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/connections")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">{whatsapp.name}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setWhatsAppModalOpen(true)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar Nome/Fila</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-xs text-muted-foreground">Conexão WhatsApp · ID #{whatsapp.id}</span>
            </div>
            <div className="ml-auto">{statusBadge}</div>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-6">
          <ConnectionStatusBanner
            isConnected={isConnected}
            isBusy={isBusy}
            status={status}
            connecting={connecting}
            onDisconnect={() => {
              setConfirmationAction("disconnect");
              setConfirmationOpen(true);
            }}
            onConnectQr={handleStartSessionQr}
            onConnectPairing={() => setInputPairingModalOpen(true)}
          />

          {status === "QRCODE" && showQrCode && (
            <QrCodePanel
              qrcode={whatsapp.qrcode}
              onCancel={() => {
                setConfirmationAction("disconnect");
                setConfirmationOpen(true);
              }}
            />
          )}

          {showPairingInput && !isConnected && (
            <PairingCodePanel pairingCode={pairingCode} onCancel={handleCancelPairing} />
          )}

          <IdentityCard whatsapp={whatsapp} isConnected={isConnected} stats={stats} />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ActionCard
              icon={<PlugZap className="h-5 w-5" />}
              label="Desconectar"
              tone="default"
              disabled={!isConnected}
              onClick={() => {
                setConfirmationAction("disconnect");
                setConfirmationOpen(true);
              }}
            />
            <ActionCard
              icon={
                restarting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCw className="h-5 w-5" />
                )
              }
              label="Reiniciar sessão"
              tone="default"
              disabled={isBusy || restarting}
              onClick={handleRestart}
            />
            <ActionCard
              icon={<QrCode className="h-5 w-5" />}
              label="Gerar QR Code"
              tone="default"
              disabled={isConnected || isBusy || connecting}
              onClick={handleStartSessionQr}
            />
            <ActionCard
              icon={<Trash2 className="h-5 w-5" />}
              label="Excluir conexão"
              tone="destructive"
              onClick={() => {
                setConfirmationAction("delete");
                setConfirmationOpen(true);
              }}
            />
          </div>

          <SessionDetailsCard
            whatsapp={whatsapp}
            status={status}
            keepAliveSaving={keepAliveSaving}
            onToggleKeepAlive={handleToggleKeepAlive}
          />
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default ConnectionConfig;
