/* @jsxImportSource react */
import React from "react";

/**
 * PageTransition — Wrapper de conteúdo de página com fade-in suave.
 * Apple-style: opacity 0→1 com timing iOS-like.
 * 
 * Uso: <PageTransition><PageContent/></PageTransition>
 * Zero dependências. CSS keyframes injetados uma vez.
 */

// Inject keyframes once
if (typeof document !== "undefined" && !document.getElementById("page-transition-keyframes")) {
  const style = document.createElement("style");
  style.id = "page-transition-keyframes";
  style.textContent = `
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.page-transition-enter {
  animation: pageFadeIn 0.25s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
}
  `;
  document.head.appendChild(style);
}

const PageTransition = ({ children, className }) => (
  <div className={`page-transition-enter ${className || ""}`}>
    {children}
  </div>
);

export default PageTransition;
