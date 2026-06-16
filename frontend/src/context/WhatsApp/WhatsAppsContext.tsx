import React, { createContext, ReactNode } from "react";
import useWhatsApps, { WhatsApp } from "../../hooks/useWhatsApps";

interface WhatsAppsContextValue {
  whatsApps: WhatsApp[];
  loading: boolean;
  reloadWhatsApps: () => Promise<void>;
}

const WhatsAppsContext = createContext<WhatsAppsContextValue>({
  whatsApps: [],
  loading: true,
  reloadWhatsApps: async () => {},
});

const WhatsAppsProvider = ({ children }: { children: ReactNode }) => {
  const { loading, whatsApps, reloadWhatsApps } = useWhatsApps();

  return (
    <WhatsAppsContext.Provider value={{ whatsApps, loading, reloadWhatsApps }}>
      {children}
    </WhatsAppsContext.Provider>
  );
};

export { WhatsAppsContext, WhatsAppsProvider };
