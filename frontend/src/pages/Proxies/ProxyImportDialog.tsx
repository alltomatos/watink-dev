import React, { useState } from "react";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import type { ProxyGroup } from "../../types/domain";

interface ProxyImportDialogProps {
  open: boolean;
  groups: ProxyGroup[];
  onClose: () => void;
  onImported: () => void;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

const ProxyImportDialog: React.FC<ProxyImportDialogProps> = ({ open, groups, onClose, onImported }) => {
  const [raw, setRaw] = useState("");
  const [scheme, setScheme] = useState("http");
  const [label, setLabel] = useState("");
  const [group, setGroup] = useState("none");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const reset = () => { setRaw(""); setScheme("http"); setLabel(""); setGroup("none"); setResult(null); };

  const handleClose = () => { reset(); onClose(); };

  const handleImport = async () => {
    if (!raw.trim()) {
      toast.warning("Cole a lista de proxies.");
      return;
    }
    setImporting(true);
    try {
      const { data } = await api.post<ImportResult>("/proxies/import", {
        raw,
        scheme,
        label,
        proxyGroupId: group === "none" ? null : Number(group),
      });
      setResult(data);
      if (data.imported > 0) {
        toast.success(`${data.imported} proxies importados.`);
        onImported();
      }
      if (data.imported === 0) {
        toast.warning("Nenhum proxy importado — verifique o formato.");
      }
    } catch (err) {
      toastError(err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar proxies em massa</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Um proxy por linha no formato <code className="font-mono">host:porta:usuário:senha</code> (formato Webshare).
            Linhas só com <code className="font-mono">host:porta</code> também são aceitas.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={scheme} onValueChange={setScheme}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="socks5">SOCKS5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Rótulo (opcional)</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="webshare-lote-1" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Grupo (opcional)</Label>
            <Select value={group} onValueChange={setGroup}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem grupo</SelectItem>
                {groups.map((g) => (
                  <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Lista</Label>
            <Textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder={"38.154.193.44:5317:user:pass\n107.173.150.216:6670:user:pass"}
            />
          </div>

          {result && (
            <div className="rounded-md border border-border bg-muted/40 p-2 text-xs space-y-1">
              <p><strong>{result.imported}</strong> importados · <strong>{result.skipped}</strong> ignorados</p>
              {result.errors?.length > 0 && (
                <ul className="text-destructive list-disc pl-4">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={handleClose}>Fechar</Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProxyImportDialog;
