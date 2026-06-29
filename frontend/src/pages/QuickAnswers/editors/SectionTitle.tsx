import React from "react";

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-3">{children}</h3>
);
