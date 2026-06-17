/* @jsxImportSource react */
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Search, 
  GitFork,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Calendar
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import toastError from "../../errors/toastError";

import { 
  PageContainer, 
  PageHeader, 
  PageContent 
} from "../../components/ui/page-layout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from "../../components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import ConfirmationModal from "../../components/ConfirmationModal";

const FlowManager = () => {
    const navigate = useNavigate();
    const [flows, setFlows] = useState<any[]>([]);
    const [whatsapps, setWhatsapps] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchParam, setSearchParam] = useState("");
    const [view, setView] = useState("grid");

    // Create/Edit Modal State
    const [openModal, setOpenModal] = useState(false);
    const [selectedFlow, setSelectedFlow] = useState<any>(null);
    const [newFlowName, setNewFlowName] = useState("");
    const [selectedWhatsapp, setSelectedWhatsapp] = useState("");

    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [deletingFlow, setDeletingFlow] = useState<any>(null);

    useEffect(() => {
        fetchFlows();
        fetchWhatsapps();
    }, []);

    const fetchFlows = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/flows');
            setFlows(Array.isArray(data) ? data : []);
            setLoading(false);
        } catch {
            setLoading(false);
        }
    };

    const fetchWhatsapps = async () => {
        try {
            const { data } = await api.get('/whatsapp');
            setWhatsapps(Array.isArray(data) ? data : []);
        } catch (_err) {
            toastError(_err);
        }
    };

    const isConnectionUsed = (whatsappId: any) => {
        return flows.some((flow) => flow.whatsappId === whatsappId && flow.isActive);
    };

    const handleOpenModal = (flow: any = null) => {
        setSelectedFlow(flow);
        setNewFlowName(flow ? flow.name : "");
        setSelectedWhatsapp(flow?.whatsappId ? String(flow.whatsappId) : "");
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setSelectedFlow(null);
        setNewFlowName("");
        setSelectedWhatsapp("");
    };

    const handleSaveFlow = async () => {
        if (!newFlowName.trim()) {
            toast.error("O nome do fluxo é obrigatório");
            return;
        }

        try {
            if (selectedFlow) {
                await api.put(`/flows/${selectedFlow.id}`, {
                    name: newFlowName,
                    whatsappId: selectedWhatsapp ? Number(selectedWhatsapp) : null,
                });
                toast.success("Fluxo atualizado com sucesso");
                fetchFlows();
                handleCloseModal();
            } else {
                const { data } = await api.post('/flows', {
                    name: newFlowName,
                    whatsappId: selectedWhatsapp ? Number(selectedWhatsapp) : null,
                    nodes: [
                        {
                            id: '1',
                            position: { x: 250, y: 50 },
                            data: { label: 'Início do Fluxo' },
                            type: 'input',
                        },
                    ],
                    edges: [],
                });
                toast.success("Fluxo criado com sucesso");
                handleCloseModal();
                navigate(`/flowbuilder/${data.id}`);
            }
        } catch (_err) {
            toastError(_err);
        }
    };

    const handleDeleteFlow = async () => {
        if (!deletingFlow) return;
        try {
            await api.delete(`/flows/${deletingFlow.id}`);
            toast.success("Fluxo removido com sucesso");
            fetchFlows();
            setConfirmModalOpen(false);
            setDeletingFlow(null);
        } catch (_err) {
            toastError(_err);
        }
    };

    const filteredFlows = flows.filter(f => 
        f.name.toLowerCase().includes(searchParam.toLowerCase())
    );

    return (
        <PageContainer>
            <ConfirmationModal
                title={deletingFlow ? `Remover Fluxo: ${deletingFlow.name}?` : "Remover Fluxo?"}
                open={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleDeleteFlow}
            >
                Esta ação é irreversível e removerá todos os nós e conexões deste fluxo de automação.
            </ConfirmationModal>

            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedFlow ? "Editar Fluxo" : "Novo Fluxo de Automação"}</DialogTitle>
                        <DialogDescription>
                            Dê um nome claro para identificar sua automação posteriormente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome do Fluxo</Label>
                            <Input
                                id="name"
                                value={newFlowName}
                                onChange={(e) => setNewFlowName(e.target.value)}
                                placeholder="Ex: Boas-vindas Vendas"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="whatsapp">Vincular Conexão</Label>
                            <Select
                                value={selectedWhatsapp}
                                onValueChange={setSelectedWhatsapp}
                            >
                                <SelectTrigger id="whatsapp">
                                    <SelectValue placeholder="Nenhuma conexão" />
                                </SelectTrigger>
                                <SelectContent>
                                    {whatsapps.map((whatsapp) => {
                                        const used = isConnectionUsed(whatsapp.id);
                                        return (
                                            <SelectItem
                                                key={whatsapp.id}
                                                value={String(whatsapp.id)}
                                                disabled={used && whatsapp.id !== selectedFlow?.whatsappId}
                                            >
                                                {whatsapp.name} {used ? "(Em uso)" : ""}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseModal}>Cancelar</Button>
                        <Button onClick={handleSaveFlow}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <PageHeader 
                title="Gestor de Fluxos"
                description="Crie e gerencie árvores de decisão e automações inteligentes"
            >
                <div className="flex items-center gap-2">
                    <div className="relative w-full max-w-sm hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar fluxos..."
                            value={searchParam}
                            onChange={(e) => setSearchParam(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                    
                    <div className="flex items-center border rounded-md p-1 bg-muted/50">
                        <Button 
                            variant={view === "list" ? "secondary" : "ghost"} 
                            size="icon" 
                            className="h-8 w-8 rounded-sm"
                            onClick={() => setView("list")}
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant={view === "grid" ? "secondary" : "ghost"} 
                            size="icon" 
                            className="h-8 w-8 rounded-sm"
                            onClick={() => setView("grid")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button onClick={() => handleOpenModal()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Fluxo
                    </Button>
                </div>
            </PageHeader>

            <PageContent>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {/* New Flow Card */}
                        <Card 
                            className="border-dashed border-2 hover:bg-muted/50 cursor-pointer transition-colors flex flex-col items-center justify-center min-h-[180px] group"
                            onClick={() => handleOpenModal()}
                        >
                            <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                <Plus size={24} />
                            </div>
                            <span className="mt-3 font-medium text-muted-foreground">Criar Automação</span>
                        </Card>

                        {filteredFlows.map((flow) => (
                            <Card 
                                key={flow.id} 
                                className="group hover:shadow-lg transition-all duration-300 flex flex-col"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <GitFork size={20} />
                                        </div>
                                        <Badge
                                            variant={flow.isActive ? "default" : "outline"}
                                            className="text-[10px] uppercase"
                                        >
                                            {flow.isActive ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors truncate">
                                        {flow.name}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-1 mt-1">
                                        <Calendar size={12} />
                                        Atualizado em {new Date(flow.updatedAt).toLocaleDateString()}
                                    </CardDescription>
                                    {flow.whatsapp && (
                                        <CardDescription className="mt-1 text-xs">
                                            Conexão: <strong>{flow.whatsapp.name}</strong>
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardFooter className="mt-auto pt-4 border-t border-border/50 flex justify-between gap-2">
                                    <div className="flex gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeletingFlow(flow);
                                                setConfirmModalOpen(true);
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenModal(flow);
                                            }}
                                        >
                                            <Edit size={16} />
                                        </Button>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        className="gap-2"
                                        onClick={() => navigate(`/flowbuilder/${flow.id}`)}
                                    >
                                        <Play size={14} fill="currentColor" />
                                        Abrir Editor
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </PageContent>
        </PageContainer>
    );
};

export default FlowManager;
