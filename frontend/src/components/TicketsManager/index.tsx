import React, { useContext, useState } from "react";
import { useTicketsContext } from "../../context/Tickets/TicketsContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { NewTicketModal } from "../NewTicketModal/NewTicketModal";
import TicketsList from "../TicketsList";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import TicketsTagFilter from "../TicketsTagFilter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, Plus, Filter, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type MainTab = "open" | "closed" | "search";

const TicketsManager: React.FC = () => {
  const { tabOpen, setTabOpen } = useTicketsContext();
  const { user } = useContext(AuthContext);

  // Estado local — tab principal, busca e modal (não expostos no TicketsContext atual)
  const [tab, setTab] = useState<MainTab>("open");
  const [searchParam, setSearchParam] = useState<string>("");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState<boolean>(false);

  // Contadores de cada sub-aba
  const [openCount, setOpenCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [groupsCount, setGroupsCount] = useState<number>(0);

  // Filtros de filas e tags
  const userQueueIds: number[] = user?.queues?.map((q: any) => q.id) ?? [];
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>(userQueueIds);
  const [selectedTags, setSelectedTags] = useState<any[]>([]);

  // Estado dos popovers
  const [queuePopoverOpen, setQueuePopoverOpen] = useState<boolean>(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState<boolean>(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchParam(term);
    if (term) {
      setTab("search");
    } else {
      setTab("open");
    }
  };

  const handleTabChange = (value: string) => {
    setTab(value as MainTab);
    setSearchParam("");
  };

  const activeMainTab = tab === "search" ? "open" : tab;

  return (
    <TooltipProvider>
      <div className="relative flex h-full flex-col overflow-hidden bg-background text-foreground">
        <NewTicketModal
          modalOpen={newTicketModalOpen}
          onClose={() => setNewTicketModalOpen(false)}
        />

        {/* ── Cabeçalho ───────────────────────────────────────────── */}
        <header className="flex flex-col gap-3 border-b bg-card px-4 pb-3 pt-4">
          {/* Linha superior: tabs segmentadas + ações */}
          <div className="flex items-center justify-between gap-2">
            <Tabs
              value={activeMainTab}
              onValueChange={handleTabChange}
              className="flex-1"
            >
              <TabsList className="w-full">
                <TabsTrigger value="open" className="flex-1 text-xs font-semibold">
                  Inbox
                </TabsTrigger>
                <TabsTrigger value="closed" className="flex-1 text-xs font-semibold">
                  Resolvidos
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-1">
              {/* Filtro de filas */}
              <Popover open={queuePopoverOpen} onOpenChange={setQueuePopoverOpen}>
                <PopoverTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label="Filtrar filas"
                      >
                        <Filter size={15} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Filtrar Filas</TooltipContent>
                  </Tooltip>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3">
                  <TicketsQueueSelect
                    selectedQueueIds={selectedQueueIds}
                    userQueues={user?.queues}
                    onChange={(values: number[]) => setSelectedQueueIds(values)}
                  />
                </PopoverContent>
              </Popover>

              {/* Filtro de tags */}
              <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                <PopoverTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label="Filtrar tags"
                      >
                        <Tag size={15} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Filtrar Tags</TooltipContent>
                  </Tooltip>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3">
                  <TicketsTagFilter
                    selectedTags={selectedTags}
                    onChange={(values: any[]) => setSelectedTags(values)}
                  />
                </PopoverContent>
              </Popover>

              {/* Novo ticket */}
              <Can
                user={user}
                perform="tickets:create"
                yes={() => (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:bg-primary/10"
                        aria-label="Novo ticket"
                        onClick={() => setNewTicketModalOpen(true)}
                      >
                        <Plus size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Novo Ticket</TooltipContent>
                  </Tooltip>
                )}
                no={() => (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:bg-primary/10"
                        aria-label="Novo ticket"
                        onClick={() => setNewTicketModalOpen(true)}
                      >
                        <Plus size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Novo Ticket</TooltipContent>
                  </Tooltip>
                )}
              />
            </div>
          </div>

          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 text-sm"
              placeholder="Buscar por nome ou mensagem..."
              value={searchParam}
              onChange={handleSearch}
            />
          </div>
        </header>

        {/* ── Sub-abas: Abertos / Aguardando / Grupos ─────────────── */}
        {(tab === "open" || tab === "search") && (
          <nav className="flex items-center gap-0.5 border-b bg-background px-2 py-1.5">
            <SubTabButton
              label="Abertos"
              count={openCount}
              active={tabOpen === "open"}
              onClick={() => setTabOpen("open")}
            />
            <SubTabButton
              label="Aguardando"
              count={pendingCount}
              active={tabOpen === "pending"}
              onClick={() => setTabOpen("pending")}
            />
            <SubTabButton
              label="Grupos"
              count={groupsCount}
              active={tabOpen === "groups"}
              onClick={() => setTabOpen("groups")}
            />
          </nav>
        )}

        {/* ── Conteúdo das listas ──────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          {/* Aba Inbox */}
          {(tab === "open" || tab === "search") && (
            <div className="h-full overflow-hidden">
              <TicketsList
                status="open"
                selectedQueueIds={selectedQueueIds}
                updateCount={(val: number) => setOpenCount(val)}
                style={tabOpen !== "open" ? { display: "none" } : {}}
                isGroup="false"
                tags={selectedTags}
                searchParam={searchParam}
              />
              <TicketsList
                status="pending"
                selectedQueueIds={selectedQueueIds}
                updateCount={(val: number) => setPendingCount(val)}
                style={tabOpen !== "pending" ? { display: "none" } : {}}
                isGroup="false"
                tags={selectedTags}
                searchParam={searchParam}
              />
              <TicketsList
                selectedQueueIds={selectedQueueIds}
                updateCount={(val: number) => setGroupsCount(val)}
                isGroup="true"
                style={tabOpen !== "groups" ? { display: "none" } : {}}
                tags={selectedTags}
                searchParam={searchParam}
              />
            </div>
          )}

          {/* Aba Resolvidos */}
          {tab === "closed" && (
            <div className="h-full overflow-hidden">
              <TicketsList
                status="closed"
                showAll={true}
                selectedQueueIds={selectedQueueIds}
                tags={selectedTags}
                searchParam={searchParam}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

// ── Componente auxiliar local ──────────────────────────────────────────────────

interface SubTabButtonProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

const SubTabButton: React.FC<SubTabButtonProps> = ({
  label,
  count,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    {label}
    <span
      className={cn(
        "min-w-[18px] rounded-full px-1 py-0.5 text-[10px] font-bold text-center leading-none",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground"
      )}
    >
      {count}
    </span>
  </button>
);

export default TicketsManager;
