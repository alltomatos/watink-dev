import React, { useState, useCallback, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode.react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Avatar } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";

import {
  ArrowLeft, Edit2, Loader2, Scan, QrCode, RefreshCw, Trash2,
  MessageSquare, CheckCircle2, PlugZap, Calendar, Star, ShieldCheck, Hash, Clock,
} from "lucide-react";

import { PageLayout, PageHeader, PageContent } from "../../components/ui/page-layout";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import PairingCodeModal from "../../components/PairingCodeModal";
import WhatsAppModal from "../../components/WhatsAppModal";
import openSocket from "../../services/socket-io";
import ConfirmationModal from "../../components/ConfirmationModal";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import { getBackendUrl } from "../../helpers/urlUtils";

interface Stats {
  messagesToday: number;
  tickets: number;
  latencyMs: number;
}

// formatPhone turns a raw "558598490991" into "+55 85 98490-0991" (best-effort,
// Brazilian layout); falls back to the raw value for unexpected formats.
const formatPhone = (raw?: string): string => {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const cc = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    const mid = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
    const end = rest.length === 9 ? rest.slice(5) : rest.slice(4);
    return `+${cc} ${ddd} ${mid}-${end}`;
  }
  return `+${digits}`;
};

// formatUptime renders the elapsed time since lastConnectedAt as "2h 14min".
const formatUptime = (since?: string | null): string => {
  if (!since) return "";
  const start = new Date(since).getTime();
  if (Number.isNaN(start)) return "";
  let secs = Math.floor((Date.now() - start) / 1000);
  if (secs < 0) secs = 0;
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};

const ConnectionConfig = () => {
  const navigate = useNavigate();
  const { whatsappId } = useParams<{ whatsappId: string }>();
  const { reloadWhatsApps } = useContext(WhatsAppsContext);
  const [whatsapp, setWhatsapp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [keepAliveSaving, setKeepAliveSaving] = useState(false);

  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsAppModalOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<"disconnect" | "delete" | null>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [showPairingInput, setShowPairingInput] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [inputPairingModalOpen, setInputPairingModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const status: string = whatsapp?.status || "DISCONNECTED";
  const isConnected = status === "CONNECTED";
  const isBusy = status === "OPENING" || status === "PAIRING";

  const fetchWhatsapp = useCallback(async () => {
    try {
      const { data } = await api.get(`/whatsapp/${whatsappId}`);
      setWhatsapp(data);
      setLoading(false);
    } catch (err: any) {
      toastError(err);
    }
  }, [whatsappId]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get(`/whatsapp/${whatsappId}/stats`);
      setStats(data);
    } catch {
      // stats are best-effort — never block the page
    }
  }, [whatsappId]);

  useEffect(() => {
    fetchWhatsapp();
  }, [fetchWhatsapp]);

  useEffect(() => {
    if (isConnected) fetchStats();
  }, [isConnected, fetchStats]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    socket.on("whatsappSession", (data: any) => {
      if (data.action === "update" && data.session.id === parseInt(whatsappId || "0")) {
        setWhatsapp((prev: any) => ({ ...prev, ...data.session }));

        if (data.session.status === "QRCODE") {
          setShowQrCode(true);
          setShowPairingInput(false);
          setConnecting(false);
          if (!data.session.qrcode) fetchWhatsapp();
        }

        if (data.session.pairingCode) {
          setPairingCode(data.session.pairingCode);
          setPairingLoading(false);
        }

        if (["CONNECTED", "QRCODE", "PAIRING", "DISCONNECTED", "TIMEOUT"].includes(data.session.status)) {
          setConnecting(false);
          setRestarting(false);
        }

        if (data.session.status === "CONNECTED") {
          setShowPairingInput(false);
          setShowQrCode(false);
          setPairingCode("");
          setPhoneNumber("");
          setPairingLoading(false);
          fetchWhatsapp();
        }

        if (data.session.status === "DISCONNECTED" || data.session.status === "TIMEOUT") {
          setShowQrCode(false);
          setShowPairingInput(false);
          setPairingLoading(false);
        }
      }
    });

    socket.on("whatsapp", (data: any) => {
      if (data.action === "update" && data.whatsapp.id === parseInt(whatsappId || "0")) {
        setWhatsapp((prev: any) => ({ ...prev, ...data.whatsapp }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [whatsappId, fetchWhatsapp]);

  // Start a QR session. Guarded so it never fires while already connected or in
  // progress — re-starting an active/opening session was what left it stuck.
  const handleStartSessionQr = async () => {
    if (isConnected || isBusy || connecting) return;
    try {
      setConnecting(true);
      setShowPairingInput(false);
      setShowQrCode(true);
      await api.post(`/whatsappsession/${whatsappId}`, { usePairingCode: false });
      await fetchWhatsapp();
    } catch (err: any) {
      toastError(err);
      setConnecting(false);
    }
  };

  const handleRestart = async () => {
    if (restarting) return;
    try {
      setRestarting(true);
      await api.put(`/whatsappsession/${whatsappId}`);
    } catch (err: any) {
      toastError(err);
      setRestarting(false);
    }
  };

  const handleRequestPairingCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toastError({ response: { data: { message: "Número de telefone inválido" } } } as any);
      return;
    }
    setPairingLoading(true);
    setPairingCode("");
    setShowPairingInput(true);
    setInputPairingModalOpen(false);
    try {
      await api.post(`/whatsappsession/${whatsappId}`, {
        usePairingCode: true,
        phoneNumber: phoneNumber.replace(/\D/g, ""),
      });
    } catch (err: any) {
      toastError(err);
      setPairingLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.delete(`/whatsappsession/${whatsappId}`);
      await fetchWhatsapp();
    } catch (err: any) {
      toastError(err);
    }
    setConfirmationOpen(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/whatsapp/${whatsappId}`);
      await reloadWhatsApps();
      navigate("/connections");
    } catch (err: any) {
      toastError(err);
    }
    setConfirmationOpen(false);
  };

  const handleToggleKeepAlive = async (next: boolean) => {
    setKeepAliveSaving(true);
    setWhatsapp((prev: any) => ({ ...prev, keepAlive: next }));
    try {
      await api.put(`/whatsapp/${whatsappId}/keepalive`, { keepAlive: next });
      toast.success(i18n.t("connections.toasts.keepAliveUpdated") as string);
    } catch (err: any) {
      setWhatsapp((prev: any) => ({ ...prev, keepAlive: !next }));
      toastError(err);
    } finally {
      setKeepAliveSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusBadge = isConnected ? (
    <Badge variant="secondary" className="bg-green-100 text-green-700 border-none gap-1">
      <span className="h-2 w-2 rounded-full bg-green-500" /> Conectado
    </Badge>
  ) : status === "QRCODE" ? (
    <Badge variant="outline" className="border-amber-400 text-amber-600">Escanear QR Code</Badge>
  ) : isBusy ? (
    <Badge variant="outline" className="animate-pulse">Iniciando...</Badge>
  ) : (
    <Badge variant="destructive">Desconectado</Badge>
  );

  return (
    <PageLayout>
      <ConfirmationModal
        title={confirmationAction === "disconnect" ? i18n.t("connections.confirmationModal.disconnectTitle") : i18n.t("connections.confirmationModal.deleteTitle")}
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={confirmationAction === "disconnect" ? handleDisconnect : handleDelete}
      >
        {confirmationAction === "disconnect" ? i18n.t("connections.confirmationModal.disconnectMessage") : i18n.t("connections.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <WhatsAppModal
        open={whatsappModalOpen}
        onClose={() => { setWhatsAppModalOpen(false); fetchWhatsapp(); }}
        whatsAppId={whatsappId}
      />

      <PairingCodeModal
        open={pairingModalOpen}
        onClose={() => setPairingModalOpen(false)}
        whatsAppId={parseInt(whatsappId || "0")}
      />

      <Dialog open={inputPairingModalOpen} onOpenChange={setInputPairingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Número para Pareamento</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="phoneNumber" className="mb-2 block">
              Digite o número do telefone com DDD (Ex: 5585999999999):
            </Label>
            <Input
              id="phoneNumber"
              autoFocus
              placeholder="5585999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInputPairingModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleRequestPairingCode} disabled={!phoneNumber || phoneNumber.length < 10 || pairingLoading}>
              {pairingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gerar Código
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setWhatsAppModalOpen(true)}>
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
          {/* Status banner */}
          {isConnected ? (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="flex items-center gap-4 p-4">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div className="flex-1">
                  <p className="font-semibold text-green-800">Sessão ativa</p>
                  <p className="text-sm text-green-700">Tudo certo — seu número está pronto para enviar e receber.</p>
                </div>
                <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}>
                  <PlugZap className="mr-2 h-4 w-4" /> Desconectar
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="flex flex-wrap items-center gap-4 p-4">
                <Scan className="h-8 w-8 text-amber-500" />
                <div className="flex-1 min-w-[200px]">
                  <p className="font-semibold text-amber-800">
                    {status === "QRCODE" ? "Aguardando leitura do QR Code" : isBusy ? "Iniciando sessão..." : "Sessão desconectada"}
                  </p>
                  <p className="text-sm text-amber-700">Conecte um número para começar a enviar e receber mensagens.</p>
                </div>
                {!isBusy && status !== "QRCODE" && (
                  <div className="flex gap-2">
                    <Button onClick={handleStartSessionQr} disabled={connecting}>
                      {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scan className="mr-2 h-4 w-4" />}
                      Conectar com QR Code
                    </Button>
                    <Button variant="outline" onClick={() => setInputPairingModalOpen(true)}>
                      Usar código
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* QR / pairing display */}
          {(status === "QRCODE" && showQrCode) && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <p className="text-sm font-medium">Escaneie o QR Code abaixo com seu celular:</p>
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  {whatsapp.qrcode ? <QRCode value={whatsapp.qrcode} size={256} /> : <Loader2 className="h-10 w-10 animate-spin text-primary" />}
                </div>
                <Button variant="outline" onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}>
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          )}

          {showPairingInput && !isConnected && (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-6">
                {!pairingCode ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Solicitando código de pareamento...</p>
                  </>
                ) : (
                  <div className="text-center">
                    <h4 className="font-mono text-3xl font-bold tracking-[0.5em]">{pairingCode}</h4>
                    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                      Insira este código no WhatsApp: Configurações → Dispositivos Conectados → Vincular Dispositivo → Vincular com código.
                    </p>
                  </div>
                )}
                <Button variant="outline" onClick={() => { setShowPairingInput(false); setPairingCode(""); setPhoneNumber(""); setPairingLoading(false); }}>
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Identity + stats */}
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8">
              <div className="relative">
                <Avatar size="xl" className="h-20 w-20" src={whatsapp.profilePicUrl ? getBackendUrl(whatsapp.profilePicUrl) : undefined} name={whatsapp.name} />
                {isConnected && (
                  <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-green-500">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </span>
                )}
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold tracking-tight">{formatPhone(whatsapp.number) || "Número não disponível"}</p>
                {isConnected && whatsapp.lastConnectedAt && (
                  <p className="mt-1 text-sm text-muted-foreground">Conectado há {formatUptime(whatsapp.lastConnectedAt)} · sincronizado</p>
                )}
              </div>

              <div className="mt-2 grid w-full max-w-md grid-cols-3 gap-3">
                <div className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold">{stats ? stats.messagesToday : "—"}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Mensagens hoje</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold">{stats ? stats.tickets : "—"}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tickets</p>
                </div>
                <div className="rounded-xl bg-muted/50 p-4 text-center">
                  <p className="text-2xl font-bold">{stats && stats.latencyMs >= 0 ? `${stats.latencyMs}ms` : "—"}</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Latência</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ActionCard
              icon={<PlugZap className="h-5 w-5" />}
              label="Desconectar"
              tone="default"
              disabled={!isConnected}
              onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}
            />
            <ActionCard
              icon={restarting ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
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
              onClick={() => { setConfirmationAction("delete"); setConfirmationOpen(true); }}
            />
          </div>

          {/* Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhes da Sessão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <DetailItem icon={<Hash className="h-4 w-4" />} label="Nome da Sessão" value={whatsapp.name} />
                <DetailItem icon={<MessageSquare className="h-4 w-4" />} label="Número Conectado" value={formatPhone(whatsapp.number) || "—"} />
                <DetailItem icon={<Calendar className="h-4 w-4" />} label="Data da 1ª Conexão" value={whatsapp.firstConnection ? new Date(whatsapp.firstConnection).toLocaleDateString() : (whatsapp.createdAt ? new Date(whatsapp.createdAt).toLocaleDateString() : "—")} />
                <DetailItem icon={<ShieldCheck className="h-4 w-4" />} label="Status Oficial" value={status} />
                <DetailItem icon={<Star className="h-4 w-4" />} label="Padrão" value={whatsapp.isDefault ? "Sim" : "Não"} />
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-muted-foreground"><Clock className="h-4 w-4" /></span>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Reconexão Automática</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Switch checked={!!whatsapp.keepAlive} disabled={keepAliveSaving} onCheckedChange={handleToggleKeepAlive} />
                      <span className="text-sm">{whatsapp.keepAlive ? "Ativado" : "Desativado"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageLayout>
  );
};

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  tone: "default" | "destructive";
  disabled?: boolean;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({ icon, label, tone, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={[
      "flex flex-col items-center justify-center gap-2 rounded-xl border p-5 text-sm font-medium transition-colors",
      "disabled:cursor-not-allowed disabled:opacity-40",
      tone === "destructive"
        ? "text-destructive hover:bg-destructive/5 border-border"
        : "text-foreground hover:bg-muted/50 border-border",
    ].join(" ")}
  >
    <span className={tone === "destructive" ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
    {label}
  </button>
);

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const DetailItem: React.FC<DetailItemProps> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5 text-muted-foreground">{icon}</span>
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  </div>
);

export default ConnectionConfig;
