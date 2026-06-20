import React from "react";
import { Loader2 } from "lucide-react";

import { PageLayout, PageContent } from "../../components/ui/page-layout";

import { useConnectionConfig } from "./hooks/useConnectionConfig";
import ConnectionActions from "./components/ConnectionActions";
import ConnectionHeader from "./components/ConnectionHeader";
import ConnectionModals from "./components/ConnectionModals";
import ConnectionStatusBanner from "./components/ConnectionStatusBanner";
import IdentityCard from "./components/IdentityCard";
import PairingCodePanel from "./components/PairingCodePanel";
import QrCodePanel from "./components/QrCodePanel";
import SessionDetailsCard from "./components/SessionDetailsCard";

const ConnectionConfig = () => {
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

  const openDisconnectConfirm = () => {
    setConfirmationAction("disconnect");
    setConfirmationOpen(true);
  };

  const openDeleteConfirm = () => {
    setConfirmationAction("delete");
    setConfirmationOpen(true);
  };

  return (
    <PageLayout>
      <ConnectionModals
        whatsappId={whatsappId}
        confirmationOpen={confirmationOpen}
        confirmationAction={confirmationAction}
        setConfirmationOpen={setConfirmationOpen}
        whatsappModalOpen={whatsappModalOpen}
        setWhatsAppModalOpen={setWhatsAppModalOpen}
        pairingModalOpen={pairingModalOpen}
        setPairingModalOpen={setPairingModalOpen}
        inputPairingModalOpen={inputPairingModalOpen}
        setInputPairingModalOpen={setInputPairingModalOpen}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        pairingLoading={pairingLoading}
        fetchWhatsapp={fetchWhatsapp}
        handleDisconnect={handleDisconnect}
        handleDelete={handleDelete}
        handleRequestPairingCode={handleRequestPairingCode}
      />

      <ConnectionHeader
        whatsapp={whatsapp}
        status={status}
        isConnected={isConnected}
        isBusy={isBusy}
        onEditClick={() => setWhatsAppModalOpen(true)}
      />

      <PageContent>
        <div className="space-y-6">
          <ConnectionStatusBanner
            isConnected={isConnected}
            isBusy={isBusy}
            status={status}
            connecting={connecting}
            onDisconnect={openDisconnectConfirm}
            onConnectQr={handleStartSessionQr}
            onConnectPairing={() => setInputPairingModalOpen(true)}
          />

          {status === "QRCODE" && showQrCode && (
            <QrCodePanel qrcode={whatsapp.qrcode} onCancel={openDisconnectConfirm} />
          )}

          {showPairingInput && !isConnected && (
            <PairingCodePanel pairingCode={pairingCode} onCancel={handleCancelPairing} />
          )}

          <IdentityCard whatsapp={whatsapp} isConnected={isConnected} stats={stats} />

          <ConnectionActions
            isConnected={isConnected}
            isBusy={isBusy}
            connecting={connecting}
            restarting={restarting}
            onDisconnect={openDisconnectConfirm}
            onRestart={handleRestart}
            onStartQr={handleStartSessionQr}
            onDelete={openDeleteConfirm}
          />

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
