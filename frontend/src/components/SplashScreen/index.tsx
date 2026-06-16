import React from "react";
import { Loader2 } from "lucide-react";

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--color-bg-surface-alt)]">
      <img
        src="/logo.png"
        alt="Watink"
        className="w-[250px] mb-5 animate-[pulse_2s_ease-in-out_infinite]"
        onError={(e) => {
          const img = e.currentTarget;
          img.onerror = null;
          img.src = "https://watink.com/logo.png";
        }}
      />
      <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
      <p className="mt-4 text-sm font-medium text-[var(--muted-foreground)]">
        Iniciando ambiente...
      </p>
    </div>
  );
};

export default SplashScreen;
