import React from "react";
import { Loader2 } from "lucide-react";
import { i18n } from "../../translate/i18n";

/**
 * PageLoader — Fallback para Suspense durante lazy-loading de módulos/rotas.
 * Preenche toda a área de conteúdo com um spinner central para que a troca
 * de módulo nunca pareça uma tela em branco enquanto o chunk carrega.
 */
const PageLoader: React.FC = () => (
  <div className="flex h-full min-h-[60vh] w-full flex-col items-center justify-center gap-3">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground animate-pulse">
      {i18n.t("common.loading")}
    </p>
  </div>
);

export default PageLoader;
