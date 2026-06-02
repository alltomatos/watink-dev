/* @jsxImportSource react */
import React, { useContext, useEffect, useRef, useState } from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import clsx from "clsx";
import Paper from "@material-ui/core/Paper";
import SearchIcon from "@material-ui/icons/Search";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import TabPanel from "../TabPanel";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useTicketsContext } from "../../context/Tickets/TicketsContext";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import TicketsTagFilter from "../TicketsTagFilter";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Checkbox, Typography, IconButton, Tooltip, Popover } from "@material-ui/core";
import { toast } from "react-toastify";
import AddIcon from "@material-ui/icons/Add";
import FilterListIcon from "@material-ui/icons/FilterList";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "var(--bg-default)",
    color: "var(--text-primary)",
    fontFamily: theme.typography.fontFamily,
  },
  headerContainer: {
    padding: "20px 24px 12px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    backgroundColor: "var(--bg-surface)",
    borderBottom: "1px solid var(--border-default)",
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "var(--text-primary)",
    letterSpacing: "-0.025em",
  },
  tabSegmented: {
    display: "inline-flex",
    backgroundColor: "var(--bg-surface-alt)",
    padding: 2,
    borderRadius: 8,
    gap: 2,
  },
  tabItem: {
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: "0.8125rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s var(--ease-out)",
    userSelect: "none",
    color: "var(--text-secondary)",
    "&:hover": {
      color: "var(--text-primary)",
    },
    "&.active": {
      backgroundColor: "var(--bg-surface)",
      color: "var(--text-primary)",
      boxShadow: "var(--shadow-sm)",
    }
  },
  searchWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  searchInput: {
    width: "100%",
    backgroundColor: "var(--bg-surface-alt)",
    borderRadius: 8,
    padding: "8px 12px 8px 36px",
    fontSize: "0.875rem",
    border: "1px solid transparent",
    transition: "all 0.2s var(--ease-out)",
    "&:focus-within": {
      backgroundColor: "var(--bg-surface)",
      borderColor: "var(--action-primary)",
      boxShadow: "0 0 0 4px var(--action-primary-bg)",
    }
  },
  searchIcon: {
    position: "absolute",
    left: 10,
    color: "var(--text-muted)",
    fontSize: "1.2rem",
  },
  subTabContainer: {
    display: "flex",
    padding: "8px 20px",
    gap: 4,
    backgroundColor: "var(--bg-surface)",
    borderBottom: "1px solid var(--border-default)",
  },
  subTabItem: {
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: "0.8125rem",
    fontWeight: 500,
    cursor: "pointer",
    color: "var(--text-secondary)",
    display: "flex",
    alignItems: "center",
    gap: 6,
    transition: "all 0.2s var(--ease-out)",
    "&:hover": {
      backgroundColor: "var(--bg-surface-alt)",
      color: "var(--text-primary)",
    },
    "&.active": {
      color: "var(--action-primary)",
      backgroundColor: "var(--action-primary-bg)",
    }
  },
  badgeCount: {
    fontSize: "0.75rem",
    backgroundColor: "var(--bg-surface-alt)",
    color: "var(--text-secondary)",
    padding: "1px 6px",
    borderRadius: 10,
    minWidth: 20,
    textAlign: "center",
    fontWeight: 600,
    ".active &": {
      backgroundColor: "var(--action-primary)",
      color: "var(--text-inverse)",
    }
  },
  actionsWrapper: {
    display: "flex",
    gap: 8,
  },
  actionButton: {
  padding: 6,
  borderRadius: 6,
  color: "var(--text-tertiary)",
  backgroundColor: "var(--bg-surface-alt)",
  "&:hover": {
  backgroundColor: "var(--border-default)",
  color: "var(--text-primary)",
  }
  }
}));

const TicketsManager = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { 
    tab, 
    setTab, 
    searchParam, 
    setSearchParam, 
    tabOpen, 
    setTabOpen,
    newTicketModalOpen,
    setNewTicketModalOpen
  } = useTicketsContext();
  
  const { user } = useContext(AuthContext);
  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const userQueueIds = user?.queues?.map((q) => q.id) || [];
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [selectedTags, setSelectedTags] = useState([]);
  
  const [anchorElQueue, setAnchorElQueue] = useState(null);
  const [anchorElTag, setAnchorElTag] = useState(null);

  const handleSearch = (e) => {
    const term = e.target.value.toLowerCase();
    setSearchParam(term);
  };

  return (
    <div className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={() => setNewTicketModalOpen(false)}
      />

      <header className={classes.headerContainer}>
        <div className={classes.headerTop}>
          <div className={classes.tabSegmented}>
            <div 
              className={clsx(classes.tabItem, (tab === "open" || tab === "search") && "active")}
              onClick={() => setTab("open")}
            >
              Inbox
            </div>
            <div 
              className={clsx(classes.tabItem, tab === "closed" && "active")}
              onClick={() => setTab("closed")}
            >
              Resolvidos
            </div>
          </div>
          
          <div className={classes.actionsWrapper}>
            <Tooltip title="Filtrar Filas">
              <IconButton size="small" className={classes.actionButton} onClick={(e) => setAnchorElQueue(e.currentTarget)}>
                <FilterListIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Novo Ticket">
              <IconButton size="small" className={classes.actionButton} color="primary" onClick={() => setNewTicketModalOpen(true)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className={classes.searchWrapper}>
          <SearchIcon className={classes.searchIcon} />
          <InputBase
            className={classes.searchInput}
            placeholder="Buscar por nome ou mensagem..."
            onChange={handleSearch}
          />
        </div>

        <Popover
          open={Boolean(anchorElQueue)}
          anchorEl={anchorElQueue}
          onClose={() => setAnchorElQueue(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          PaperProps={{ style: { padding: 16, borderRadius: 12, minWidth: 250, boxShadow: 'var(--shadow-lg)' } }}
        >
          <TicketsQueueSelect
            selectedQueueIds={selectedQueueIds}
            userQueues={user?.queues}
            onChange={(values) => setSelectedQueueIds(values)}
          />
        </Popover>
      </header>

      <nav className={classes.subTabContainer}>
        <div 
          className={clsx(classes.subTabItem, tabOpen === "open" && "active")}
          onClick={() => setTabOpen("open")}
        >
          Abertos
          <span className={classes.badgeCount}>{openCount}</span>
        </div>
        <div 
          className={clsx(classes.subTabItem, tabOpen === "pending" && "active")}
          onClick={() => setTabOpen("pending")}
        >
          Aguardando
          <span className={classes.badgeCount}>{pendingCount}</span>
        </div>
        <div 
          className={clsx(classes.subTabItem, tabOpen === "groups" && "active")}
          onClick={() => setTabOpen("groups")}
        >
          Grupos
          <span className={classes.badgeCount}>{groupsCount}</span>
        </div>
      </nav>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
          <TicketsList
            status="open"
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={tabOpen !== "open" ? { display: 'none' } : {}}
            isGroup="false"
            tags={selectedTags}
            searchParam={searchParam}
          />
          <TicketsList
            status="pending"
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={tabOpen !== "pending" ? { display: 'none' } : {}}
            isGroup="false"
            tags={selectedTags}
            searchParam={searchParam}
          />
          <TicketsList
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setGroupsCount(val)}
            isGroup="true"
            style={tabOpen !== "groups" ? { display: 'none' } : {}}
            tags={selectedTags}
            searchParam={searchParam}
          />
        </TabPanel>
        <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
          <TicketsList
            status="closed"
            showAll={true}
            selectedQueueIds={selectedQueueIds}
            tags={selectedTags}
            searchParam={searchParam}
          />
        </TabPanel>
      </div>
    </div>
  );
};

export default TicketsManager;
