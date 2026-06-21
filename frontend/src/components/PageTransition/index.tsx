import React, { ReactNode } from "react";

/**
 * PageTransition — Wrapper com fade-in suave. Zero deps.
 */
if (
  typeof document !== "undefined" &&
  !document.getElementById("page-transition-keyframes")
) {
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

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className,
}) => (
  <div className={`page-transition-enter h-full ${className || ""}`}>{children}</div>
);

export default PageTransition;
