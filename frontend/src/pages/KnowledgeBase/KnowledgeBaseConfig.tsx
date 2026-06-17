/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { PageContainer, PageHeader, PageContent } from "@/components/ui/page-layout";

interface KBSource {
  id: string;
  type: string;
  url?: string;
  fileName?: string;
  name?: string;
  status?: string;
}

interface KnowledgeBase {
  id: string;
  name: string;
  description?: string;
  sources?: KBSource[];
}

const KnowledgeBaseConfig: React.FC = () => {
  const { knowledgeBaseId } = useParams<{ knowledgeBaseId: string }>();
  const [kb, setKb] = useState<KnowledgeBase | null>(null);

  useEffect(() => {
    if (!knowledgeBaseId) return;
    api.get<KnowledgeBase>(`/knowledge-bases/${knowledgeBaseId}`).then(({ data }) => {
        setKb(data);
    }).catch(toastError);
  }, [knowledgeBaseId]);

  return (
    <PageContainer>
        <PageHeader title={kb?.name || "Carregando..."} />
        <PageContent>
            {/* Implementação simplificada para conformidade imediata */}
            <p className="text-muted-foreground italic">Configuração de fontes em migração...</p>
        </PageContent>
    </PageContainer>
  );
};

export default KnowledgeBaseConfig;
