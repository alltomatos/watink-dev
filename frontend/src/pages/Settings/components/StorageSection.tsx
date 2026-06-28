/* @jsxImportSource react */
import React, { useEffect, useState } from "react";
import { HardDrive, Loader2 } from "lucide-react";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";

interface StorageStatus {
  configured: boolean;
  driver?: string;
  endpoint?: string;
  bucket?: string;
  region?: string;
  useSSL?: boolean;
}

const StorageSection: React.FC = () => {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<StorageStatus>("/system/storage")
      .then(({ data }) => setStatus(data))
      .catch(toastError)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <HardDrive className="h-5 w-5" />
          Armazenamento de Arquivos (S3)
        </CardTitle>
        <CardDescription>
          Object store dos arquivos da Base de Conhecimento. Driver portável:
          MinIO (dev) → Cloudflare R2 / AWS S3 (produção). Configurado via
          variáveis de ambiente <code>S3_*</code>.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : !status?.configured ? (
          <Badge className="border-transparent bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-text))]">
            Não configurado
          </Badge>
        ) : (
          <div className="flex flex-col gap-4">
            <Badge className="w-fit border-transparent bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-text))]">
              Conectado
            </Badge>
            <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Endpoint</dt>
              <dd className="text-foreground font-mono break-all">
                {status.endpoint}
              </dd>
              <dt className="text-muted-foreground">Bucket</dt>
              <dd className="text-foreground font-mono">{status.bucket}</dd>
              <dt className="text-muted-foreground">Região</dt>
              <dd className="text-foreground font-mono">{status.region}</dd>
              <dt className="text-muted-foreground">SSL</dt>
              <dd className="text-foreground">{status.useSSL ? "Sim" : "Não"}</dd>
            </dl>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StorageSection;
