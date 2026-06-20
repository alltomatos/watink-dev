import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Play, Download, Upload, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface FlowToolbarProps {
    flowName: string;
    flowId: string | undefined;
    isActive: boolean;
    saving: boolean;
    fileInputRef: React.RefObject<HTMLInputElement>;
    onNavigateBack: () => void;
    onToggle: () => void;
    onValidate: () => void;
    onSimulate: () => void;
    onImportClick: () => void;
    onExport: () => void;
    onSave: () => void;
    onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FlowToolbar({
    flowName,
    flowId,
    isActive,
    saving,
    fileInputRef,
    onNavigateBack,
    onToggle,
    onValidate,
    onSimulate,
    onImportClick,
    onExport,
    onSave,
    onFileChange,
}: FlowToolbarProps) {
    return (
        <header className="flex h-16 items-center justify-between border-b px-6 shrink-0 z-10 bg-card">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onNavigateBack}>
                    <ArrowLeft size={20} />
                </Button>
                <div>
                    <h1 className="text-lg font-bold leading-none">{flowName}</h1>
                    <p className="text-xs text-muted-foreground mt-1">ID: {flowId}</p>
                </div>
                <Badge
                    variant={isActive ? 'secondary' : 'outline'}
                    className={isActive ? 'bg-green-100 text-green-700' : ''}
                >
                    {isActive ? 'Ativo' : 'Pausado'}
                </Badge>
            </div>

            <div className="flex items-center gap-3">
                <input
                    accept=".json"
                    className="hidden"
                    id="import-flow-file"
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                />

                <div className="flex items-center gap-2 mr-2 border-r pr-3">
                    <Label htmlFor="active-toggle" className="text-xs font-medium cursor-pointer">
                        Status:
                    </Label>
                    <Switch id="active-toggle" checked={isActive} onCheckedChange={onToggle} />
                </div>

                <Button variant="outline" size="sm" className="gap-2 text-green-600" onClick={onValidate}>
                    <CheckCircle2 size={14} /> Validar
                </Button>

                <Button variant="outline" size="sm" className="gap-2" onClick={onSimulate}>
                    <Play size={14} fill="currentColor" /> Simular
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 hidden md:flex"
                    onClick={onImportClick}
                >
                    <Upload size={14} /> Importar
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 hidden md:flex"
                    onClick={onExport}
                >
                    <Download size={14} /> Exportar
                </Button>

                <Button
                    size="sm"
                    className="gap-2 min-w-[100px]"
                    onClick={onSave}
                    disabled={saving}
                >
                    {saving ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Save size={14} />
                    )}
                    {saving ? 'Salvando...' : 'Salvar'}
                </Button>
            </div>
        </header>
    );
}
