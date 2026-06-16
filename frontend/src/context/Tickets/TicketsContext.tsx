import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
} from "react";

type TabOpen = "open" | "pending" | "closed" | "group" | string;

interface TicketsContextValue {
  tabOpen: TabOpen;
  setTabOpen: (tab: TabOpen) => void;
}

const TicketsContext = createContext<TicketsContextValue>({
  tabOpen: "open",
  setTabOpen: () => {},
});

const TicketsProvider = ({ children }: { children: ReactNode }) => {
  const [tabOpen, setTabOpen] = useState<TabOpen>("open");

  return (
    <TicketsContext.Provider value={{ tabOpen, setTabOpen }}>
      {children}
    </TicketsContext.Provider>
  );
};

const useTicketsContext = (): TicketsContextValue => {
  const context = useContext(TicketsContext);
  if (!context) {
    throw new Error(
      "useTicketsContext must be used within a TicketsProvider"
    );
  }
  return context;
};

export { TicketsContext, TicketsProvider, useTicketsContext };
