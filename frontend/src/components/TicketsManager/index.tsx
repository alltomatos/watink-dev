import React, { useContext, useState } from "react";
import { useTicketsContext } from "../../context/Tickets/TicketsContext";
import { AuthContext } from "../../context/Auth/AuthContext";
import { NewTicketModal } from "../NewTicketModal/NewTicketModal";
import TicketsList from "../TicketsList";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import TicketsTagFilter from "../TicketsTagFilter";
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

type StatusFilter = "all" | "open" | "pending" | "closed";

const TicketsManager: React.FC = () => {
  const { } = useTicketsContext();
  const { user } = useContext(AuthContext);

  // Estado local
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchParam, setSearchParam] = useState<string>("");
  const [newTicketModalOpen, setNewTicketModalOpen] = useState<boolean>(false);

  // Contadores
  const [openCount, setOpenCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Filtros
  const userQueueIds: number[] = user?.queues?.map((q: any) => q.id) ?? [];
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>(userQueueIds);
  const [selectedTags, setSelectedTags] = useState<any[]>([]);

  // Popovers
  const [queuePopoverOpen, setQueuePopoverOpen] = useState<boolean>(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState<boolean>(false);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(e.target.value.toLowerCase());
  };

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setSearchParam("");
  };

  return (
    <TooltipProvider>
      <div className="relative flex h-full flex-col overflow-hidden bg-background text-foreground">
        <NewTicketModal
          modalOpen={newTicketModalOpen}
          onClose={() => setNewTicketModalOpen(false)}
        />

        {/* ── Cabeçalho ───────────────────────────────────────────── */}
        <header className="flex flex-col gap-2 border-b bg-card px-3 pb-3 pt-3">
          {/* Linha: busca + ações */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8 text-sm h-8 bg-muted/60 border-0 focus-visible:ring-1"
                placeholder="Buscar..."
                value={searchParam}
                onChange={handleSearch}
              />
            </div>

            {/* Filtro de filas */}
            <Popover open={queuePopoverOpen} onOpenChange={setQueuePopoverOpen}>
              <PopoverTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" aria-label="Filtrar filas">
                      <Filter size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Filtrar Filas</TooltipContent>
                </Tooltip>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3">
                <TicketsQueueSelect selectedQueueIds={selectedQueueIds} userQueues={user?.queues} onChange={(values: number[]) => setSelectedQueueIds(values)} />
              </PopoverContent>
            </Popover>

            {/* Filtro de tags */}
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground" aria-label="Filtrar tags">
                      <Tag size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Filtrar Tags</TooltipContent>
                </Tooltip>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3">
                <TicketsTagFilter selectedTags={selectedTags} onChange={(values: any[]) => setSelectedTags(values)} />
              </PopoverContent>
            </Popover>

            {/* Novo ticket */}
            <Can
              user={user}
              perform="tickets:create"
              yes={() => (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-primary hover:bg-primary/10" aria-label="Novo ticket" onClick={() => setNewTicketModalOpen(true)}>
                      <Plus size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Novo Ticket</TooltipContent>
                </Tooltip>
              )}
              no={() => null}
            />
          </div>

          {/* Pills: Todos / Abertos / Aguardando / Fechados */}
          <div className="flex items-center gap-1">
            <FilterPill label="Todos"      active={statusFilter === "all"}     onClick={() => handleFilterChange("all")} />
            <FilterPill label="Abertos"    active={statusFilter === "open"}    onClick={() => handleFilterChange("open")}    count={openCount} />
            <FilterPill label="Aguardando" active={statusFilter === "pending"} onClick={() => handleFilterChange("pending")} count={pendingCount} />
            <FilterPill label="Fechados"   active={statusFilter === "closed"}  onClick={() => handleFilterChange("closed")} />
          </div>
        </header>

        {/* ── Conteúdo das listas ──────────────────────────────────── */}
        <div className="flex-1 overflow-hidden">
          {statusFilter !== "closed" && (
            <div className="h-full overflow-hidden">
              <TicketsList
                status="open"
                selectedQueueIds={selectedQueueIds}
                updateCount={(val: number) => setOpenCount(val)}
                style={statusFilter === "pending" ? { display: "none" } : {}}
                isGroup="false"
                tags={selectedTags}
                searchParam={searchParam}
              />
              <TicketsList
                status="pending"
                selectedQueueIds={selectedQueueIds}
                updateCount={(val: number) => setPendingCount(val)}
                style={statusFilter === "open" ? { display: "none" } : {}}
                isGroup="false"
                tags={selectedTags}
                searchParam={searchParam}
              />
            </div>
          )}

          {statusFilter === "closed" && (
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

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, active, onClick, count }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold transition-all",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    {label}
    {count !== undefined && count > 0 && (
      <span className={cn(
        "text-[10px] font-bold leading-none",
        active ? "opacity-80" : "opacity-60"
      )}>
        {count}
      </span>
    )}
  </button>
);

export default TicketsManager;
