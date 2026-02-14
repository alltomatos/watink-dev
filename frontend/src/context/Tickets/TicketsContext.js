import React, { createContext, useState, useContext } from "react";

const TicketsContext = createContext();

const TicketsProvider = ({ children }) => {
    const [tabOpen, setTabOpen] = useState("open");
    const [tab, setTab] = useState("open");
    const [searchParam, setSearchParam] = useState("");
    const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);

    return (
        <TicketsContext.Provider 
            value={{ 
                tabOpen, 
                setTabOpen, 
                tab, 
                setTab, 
                searchParam, 
                setSearchParam,
                newTicketModalOpen,
                setNewTicketModalOpen
            }}
        >
            {children}
        </TicketsContext.Provider>
    );
};

const useTicketsContext = () => {
    const context = useContext(TicketsContext);
    if (!context) {
        throw new Error("useTicketsContext must be used within a TicketsProvider");
    }
    return context;
};

export { TicketsContext, TicketsProvider, useTicketsContext };
