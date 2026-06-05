/* @jsxImportSource react */
import React from "react";

/**
 * PageLoader — Fallback para Suspense durante lazy-loading.
 * Apple-style: skeleton sutil com animação pulse.
 * Zero dependências. CSS-only.
 */

if (typeof document !== "undefined" && !document.getElementById("page-loader-keyframes")) {
  const style = document.createElement("style");
  style.id = "page-loader-keyframes";
  style.textContent = `
@keyframes pageLoaderPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.page-loader-bar {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--action-primary);
  animation: pageLoaderPulse 1.2s ease-in-out infinite;
}
  `;
  document.head.appendChild(style);
}

const PageLoader = () => (
  <div style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    minHeight: 200,
    width: "100%",
  }}>
    <div className="page-loader-bar" />
  </div>
);

export default PageLoader;
