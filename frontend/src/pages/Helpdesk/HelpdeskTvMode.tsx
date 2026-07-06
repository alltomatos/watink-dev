import React, { useEffect } from "react";
import HelpdeskKanban from "./HelpdeskKanban";

/**
 * TV Mode — Fullscreen Helpdesk Kanban.
 * Sem sidebar, sem header — apenas o board Kanban.
 * Ideal para exibição em TVs ou monitores para visibilidade da equipe.
 */
const HelpdeskTvMode: React.FC = () => {
  useEffect(() => {
    const requestFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        void err; // fullscreen request failed — silent
      }
    };

    requestFullscreen();

    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] bg-[hsl(var(--bg-surface-alt))]">
      <HelpdeskKanban tvMode={true} />
    </div>
  );
};

export default HelpdeskTvMode;
