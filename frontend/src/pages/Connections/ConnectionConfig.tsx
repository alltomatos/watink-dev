import React, { useState, useCallback, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode.react";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Avatar } from "../../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";

import { ArrowLeft, Scan, Edit2, Loader2 } from "lucide-react";

import MainContainer from "../../components/MainContainer";
import Title from "../../components/Title";
import ConnectionStatusCard from "../../components/ConnectionStatusCard";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import PairingCodeModal from "../../components/PairingCodeModal";
import WhatsAppModal from "../../components/WhatsAppModal";
import openSocket from "../../services/socket-io";
import ConfirmationModal from "../../components/ConfirmationModal";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import { getBackendUrl } from "../../helpers/urlUtils";

const ConnectionConfig = () => {
    const navigate = useNavigate();
    const { whatsappId } = useParams<{ whatsappId: string }>();
    const { reloadWhatsApps } = useContext(WhatsAppsContext);
    const [whatsapp, setWhatsapp] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pairingModalOpen, setPairingModalOpen] = useState(false);
    const [whatsappModalOpen, setWhatsAppModalOpen] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState<"disconnect" | "delete" | null>(null);
    
    // Inline pairing code states
    const [phoneNumber, setPhoneNumber] = useState("");
    const [pairingCode, setPairingCode] = useState("");
    const [pairingLoading, setPairingLoading] = useState(false);
    const [showPairingInput, setShowPairingInput] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);
    const [inputPairingModalOpen, setInputPairingModalOpen] = useState(false);
    const [connecting, setConnecting] = useState(false);

    const fetchWhatsapp = useCallback(async () => {
        try {
            const { data } = await api.get(`/whatsapp/${whatsappId}`);
            setWhatsapp(data);
            setLoading(false);
        } catch (err: any) {
            toastError(err);
        }
    }, [whatsappId]);

    useEffect(() => {
        fetchWhatsapp();
    }, [fetchWhatsapp]);

    useEffect(() => {
        const socket = openSocket();

        socket.on("whatsappSession", (data: any) => {
            if (data.action === "update" && data.session.id === parseInt(whatsappId || "0")) {
                setWhatsapp((prev: any) => ({ ...prev, ...data.session }));

                if (data.session.status === "QRCODE") {
                    setShowQrCode(true);
                    setShowPairingInput(false);
                    setConnecting(false);

                    if (!data.session.qrcode) {
                        fetchWhatsapp();
                    }
                }

                if (data.session.pairingCode) {
                    setPairingCode(data.session.pairingCode);
                    setPairingLoading(false);
                }
                
                if (["CONNECTED", "QRCODE", "PAIRING", "DISCONNECTED", "TIMEOUT"].includes(data.session.status)) {
                    setConnecting(false);
                }
                
                if (data.session.status === "CONNECTED") {
                    setShowPairingInput(false);
                    setShowQrCode(false);
                    setPairingCode("");
                    setPhoneNumber("");
                    setPairingLoading(false);
                    window.location.reload();
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

    useEffect(() => {
        if (whatsapp?.status === "QRCODE") {
            setShowQrCode(true);
            setShowPairingInput(false);
            setConnecting(false);
        } else if (whatsapp?.status === "CONNECTED") {
            setShowQrCode(false);
            setShowPairingInput(false);
            setConnecting(false);
        } else if (whatsapp?.status === "DISCONNECTED" || whatsapp?.status === "TIMEOUT") {
            setShowQrCode(false);
            setShowPairingInput(false);
            setConnecting(false);
        } else if (whatsapp?.status === "PAIRING") {
            setConnecting(false);
        }
    }, [whatsapp?.status]);

    const handleStartSessionQr = async () => {
        try {
            if (whatsapp.status === "QRCODE") {
                setShowQrCode(true);
                setShowPairingInput(false);
                return;
            }

            setConnecting(true);
            setShowPairingInput(false);
            await api.post(`/whatsappsession/${whatsappId}`, { usePairingCode: false });

            const checkQrCode = setInterval(() => {
                if (whatsapp.qrcode) {
                    clearInterval(checkQrCode);
                    window.location.reload();
                }
            }, 1000);

            setTimeout(() => clearInterval(checkQrCode), 15000);

        } catch (err: any) {
            toastError(err);
            setConnecting(false);
        }
    };

    const handleRequestPairingCode = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            toastError({ response: { data: { message: "Número de telefone inválido" } } } as any);
            return;
        }
        setPairingLoading(true);
        setPairingCode("");
        try {
            await api.post(`/whatsappsession/${whatsappId}`, {
                usePairingCode: true,
                phoneNumber: phoneNumber.replace(/\D/g, "")
            });
            window.location.reload();
        } catch (err: any) {
            toastError(err);
            setPairingLoading(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await api.delete(`/whatsappsession/${whatsappId}`);
            window.location.reload();
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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <MainContainer>
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
                        <Button variant="outline" onClick={() => setInputPairingModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleRequestPairingCode}
                            disabled={!phoneNumber || phoneNumber.length < 10 || pairingLoading}
                        >
                            {pairingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Gerar Código
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="mb-6 flex items-center justify-between p-6 pb-0">
                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/connections")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <Title>{whatsapp.name}</Title>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setWhatsAppModalOpen(true)} className="ml-2">
                                    <Edit2 className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar Nome/Fila</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <ConnectionStatusCard status={whatsapp.status} />

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Ações da Sessão</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap items-center justify-center gap-4">
                                {(!whatsapp.status || whatsapp.status === "DISCONNECTED" || whatsapp.status === "TIMEOUT") && !showQrCode && !showPairingInput && (
                                    <>
                                        <Button
                                            onClick={handleStartSessionQr}
                                            disabled={connecting}
                                            className="min-w-[200px]"
                                        >
                                            {connecting ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando Conexão...</>
                                            ) : (
                                                <><Scan className="mr-2 h-4 w-4" /> CONECTAR COM QR CODE</>
                                            )}
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={() => { setConfirmationAction("delete"); setConfirmationOpen(true); }}
                                        >
                                            EXCLUIR
                                        </Button>
                                    </>
                                )}

                                {showPairingInput && (!whatsapp.status || whatsapp.status === "DISCONNECTED" || whatsapp.status === "TIMEOUT" || whatsapp.status === "OPENING" || whatsapp.status === "PAIRING") && (
                                    <div className="flex w-full flex-col items-center justify-center space-y-6 p-4">
                                        {!pairingCode && (
                                            <div className="flex flex-col items-center">
                                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                                <p className="mt-4 text-sm text-muted-foreground">
                                                    Solicitando código de pareamento...
                                                </p>
                                            </div>
                                        )}
                                        {pairingCode && (
                                            <div className="text-center">
                                                <h4 className="font-mono text-3xl tracking-[0.5em] font-bold">
                                                    {pairingCode}
                                                </h4>
                                                <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                                                    Insira este código no seu WhatsApp: Configurações → Dispositivos Conectados → Vincular Dispositivo → Vincular com código de 8 dígitos
                                                </p>
                                            </div>
                                        )}
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowPairingInput(false);
                                                setPairingCode("");
                                                setPhoneNumber("");
                                                setPairingLoading(false);
                                                if (whatsapp.status === "OPENING") {
                                                    setConfirmationAction("disconnect");
                                                    setConfirmationOpen(true);
                                                }
                                            }}
                                        >
                                            CANCELAR
                                        </Button>
                                    </div>
                                )}

                                {whatsapp.status === "OPENING" && !showPairingInput && (
                                    <div className="flex items-center space-x-3 text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        <span>Iniciando sessão... aguarde alguns segundos.</span>
                                    </div>
                                )}

                                {whatsapp.status === "QRCODE" && showQrCode && (
                                    <div className="flex w-full flex-col items-center space-y-6 p-4">
                                        <p className="text-sm font-medium">
                                            Escaneie o QR Code abaixo com seu celular:
                                        </p>
                                        <div className="rounded-xl bg-white p-4 shadow-sm border">
                                            {whatsapp.qrcode ? (
                                                <QRCode value={whatsapp.qrcode} size={256} />
                                            ) : (
                                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                            )}
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}
                                        >
                                            CANCELAR / DESCONECTAR
                                        </Button>
                                    </div>
                                )}

                                {whatsapp.status === "PAIRING" && !showPairingInput && (
                                    <>
                                        <Button onClick={() => setPairingModalOpen(true)}>
                                            MOSTRAR CÓDIGO
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}
                                        >
                                            CANCELAR
                                        </Button>
                                    </>
                                )}

                                {whatsapp.status === "CONNECTED" && (
                                    <Button
                                        variant="outline"
                                        onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}
                                    >
                                        DESCONECTAR
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-1">
                    <Card className="h-full transition-transform hover:-translate-y-1">
                        <CardHeader>
                            <CardTitle className="text-lg">Detalhes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-4 mb-4">
                                <Avatar className="h-14 w-14 rounded-xl border" size="xl" src={whatsapp.profilePicUrl ? getBackendUrl(whatsapp.profilePicUrl) : undefined} name={whatsapp.name} />
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Nome da Sessão</p>
                                    <p className="text-sm font-semibold">{whatsapp.name}</p>
                                </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-3 pt-2">
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Número Conectado</p>
                                    <p className="text-sm">{whatsapp.number || "Não disponível"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Data da 1ª Conexão</p>
                                    <p className="text-sm">
                                        {whatsapp.createdAt ? new Date(whatsapp.createdAt).toLocaleDateString() : "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Status Oficial</p>
                                    <p className="text-sm">{whatsapp.status}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Padrão</p>
                                    <p className="text-sm">{whatsapp.isDefault ? "Sim" : "Não"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Reconexão Automática (Keep Alive)</p>
                                    <p className="text-sm">{whatsapp.keepAlive ? "Ativado" : "Desativado"}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-muted-foreground">Sincronizar Histórico</p>
                                    <p className="text-sm">{whatsapp.syncHistory ? "Ativado" : "Desativado"}</p>
                                    {whatsapp.syncHistory && whatsapp.syncPeriod && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Data Inicial: {new Date(whatsapp.syncPeriod).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </MainContainer>
    );
};

export default ConnectionConfig;
