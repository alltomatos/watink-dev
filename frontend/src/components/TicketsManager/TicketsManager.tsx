import React, { useContext, useState } from "react";
import { useTicketsContext } from "../../context/Tickets/TicketsContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import TicketsQueueSelect from "../TicketsQueueSelect";

export const TicketsManager: React.FC = () => {
  const {
    tab,
    setTab,
    searchParam,
    setSearchParam,
    tabOpen,
    setTabOpen,
    newTicketModalOpen,
    setNewTicketModalOpen,
  } = useTicketsContext();

  const { user } = useContext(AuthContext);
  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>(user?.queues?.map((q) => q.id) || []);
  const [selectedTags] = useState<any[]>([]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(e.target.value.toLowerCase());
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={() => setNewTicketModalOpen(false)}
      />

      <header className="border-b bg-card p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="open">Inbox</TabsTrigger>
            <TabsTrigger value="closed">Resolvidos</TabsTrigger>
          </TabsList>
        </Tabs>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                  <Filter size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <TicketsQueueSelect
                  selectedQueueIds={selectedQueueIds}
                  userQueues={user?.queues}
                  onChange={(values: number[]) => setSelectedQueueIds(values)}
                />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setNewTicketModalOpen(true)}>
              <Plus size={16} />
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou mensagem..."
            onChange={handleSearch}
          />
        </div>
      </header>

      <nav className="flex items-center gap-1 p-2 border-b bg-background">
        <Button
          variant={tabOpen === "open" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTabOpen("open")}
          className="gap-2 text-xs font-semibold"
        >
          Abertos
          <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{openCount}</span>
        </Button>
        <Button
          variant={tabOpen === "pending" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTabOpen("pending")}
          className="gap-2 text-xs font-semibold"
        >
          Aguardando
          <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{pendingCount}</span>
        </Button>
        <Button
          variant={tabOpen === "groups" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setTabOpen("groups")}
          className="gap-2 text-xs font-semibold"
        >
          Grupos
          <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{groupsCount}</span>
        </Button>
      </nav>

      <div className="flex-1 overflow-hidden">
        {/* Placeholder para integração da TicketsList legacy ou refatorada */}
        <div className="h-full overflow-y-auto p-4">
           {/* TicketsList components aqui ... */}
           <p className="text-sm text-muted-foreground">Migração de TicketsList em progresso...</p>
        </div>
      </div>
    </div>
  );
};
