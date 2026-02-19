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
    backgroundColor: "#ffffff",
    color: theme.palette.text.primary,
  },
  headerContainer: {
    padding: "8px 16px",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
  },
  tabPill: {
    minWidth: 80,
    minHeight: 36,
    borderRadius: 18,
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
    margin: "0 4px",
    transition: "all 0.2s",
  },
  tabSelected: {
    backgroundColor: "#007AFF !important",
    color: "#ffffff !important",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#f0f2f5",
    borderRadius: 20,
    padding: "4px 12px",
    flex: 1,
    maxWidth: 240,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    fontSize: "0.85rem",
  },
  subTabContainer: {
    display: "flex",
    padding: "10px 16px",
    gap: 8,
    backgroundColor: "#ffffff",
    overflowX: "auto",
  },
  subTabChip: {
    padding: "6px 14px",
    borderRadius: 20,
    fontSize: "0.8rem",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    backgroundColor: "#f0f2f5",
    color: "#666",
    "&.active": {
      backgroundColor: "#e9f1ff",
      color: "#007AFF",
    }
  },
  badge: {
    right: -4,
    top: 4,
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
  const userQueueIds = user.queues.map((q) => q.id);
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

      <div className={classes.headerContainer}>
        <Tabs
          value={tab === "search" ? "open" : tab}
          onChange={(e, v) => setTab(v)}
          indicatorColor="none"
          textColor="primary"
        >
          <Tab
            value={"open"}
            label="Inbox"
            classes={{ root: classes.tabPill, selected: classes.tabSelected }}
            disableRipple
          />
          <Tab
            value={"closed"}
            label="Resolvidos"
            classes={{ root: classes.tabPill, selected: classes.tabSelected }}
            disableRipple
          />
        </Tabs>

        <div style={{ flex: 1 }} />

        <div className={classes.searchWrapper}>
          <SearchIcon fontSize="small" color="disabled" />
          <InputBase
            className={classes.searchInput}
            placeholder="Buscar..."
            onChange={handleSearch}
          />
        </div>

        <IconButton size="small" color="primary" onClick={() => setNewTicketModalOpen(true)}>
          <AddIcon />
        </IconButton>

        <IconButton size="small" onClick={(e) => setAnchorElQueue(e.currentTarget)}>
          <FilterListIcon fontSize="small" />
        </IconButton>

        <Popover
          open={Boolean(anchorElQueue)}
          anchorEl={anchorElQueue}
          onClose={() => setAnchorElQueue(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          PaperProps={{ style: { padding: 16, borderRadius: 12, minWidth: 250 } }}
        >
          <TicketsQueueSelect
            selectedQueueIds={selectedQueueIds}
            userQueues={user?.queues}
            onChange={(values) => setSelectedQueueIds(values)}
          />
        </Popover>
      </div>

      <div className={classes.subTabContainer}>
        <div 
          className={clsx(classes.subTabChip, tabOpen === "open" && "active")}
          onClick={() => setTabOpen("open")}
        >
          <Badge badgeContent={openCount} color="primary" className={classes.badge}>
            Abertos
          </Badge>
        </div>
        <div 
          className={clsx(classes.subTabChip, tabOpen === "pending" && "active")}
          onClick={() => setTabOpen("pending")}
        >
          <Badge badgeContent={pendingCount} color="secondary" className={classes.badge}>
            Aguardando
          </Badge>
        </div>
        <div 
          className={clsx(classes.subTabChip, tabOpen === "groups" && "active")}
          onClick={() => setTabOpen("groups")}
        >
          <Badge badgeContent={groupsCount} color="secondary" className={classes.badge}>
            Grupos
          </Badge>
        </div>
      </div>

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
