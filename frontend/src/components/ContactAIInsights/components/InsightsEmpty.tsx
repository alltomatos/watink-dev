import React from "react";

const InsightsEmpty = () => (
  <div className="flex flex-col items-center justify-center py-10 text-center text-[var(--text-muted)]">
    <p className="text-sm">Nenhuma análise disponível ainda.</p>
    <p className="text-xs mt-1">
      As análises são geradas quando tickets são fechados.
    </p>
  </div>
);

export default InsightsEmpty;
