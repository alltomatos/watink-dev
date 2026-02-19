/* @jsxImportSource react */
import React, { useContext, useEffect, useRef, useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import SearchIcon from "@material-ui/icons/Search";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import MoveToInboxIcon from "@material-ui/icons/MoveToInbox";
import IconButton from "@material-ui/core/IconButton";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import TabPanel from "../TabPanel";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useTicketsContext } from "../../context/Tickets/TicketsContext";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Checkbox, Typography } from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: theme.palette.type === "dark" ? theme.palette.background.default : "#f3f2fb",
    color: theme.palette.text.primary,
  },
  tab: {
    minWidth: 70,
    minHeight: 32,
    borderRadius: 8,
    margin: "0 2px",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.8rem",
    padding: "4px 8px",
  },
  tabSelected: {
    backgroundColor: theme.palette.type === "dark" ? "rgba(59,130,246,0.18)" : "#f0f2f5",
    color: theme.palette.text.primary,
  },
  ticketsSubTab: {
    textTransform: "none",
    minHeight: 36,
    fontWeight: 600,
    fontSize: "0.8rem",
    minWidth: 0,
    padding: "6px 12px",
    borderRadius: 18,
    margin: "0 4px",
  },
  ticketsSubTabSelected: {
    backgroundColor: theme.palette.type === "dark" ? "rgba(59,130,246,0.18)" : "#e9f1ff",
    color: theme.palette.primary.main,
  },
  ticketOptionsBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: theme.palette.background.paper,
    padding: "4px 8px",
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: 48,
  },
  serachInputWrapper: {
    flex: 1,
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.05)" : "#f0f2f5",
    display: "flex",
    borderRadius: 8,
    padding: "2px 10px",
    minHeight: 34,
  },
  searchIcon: {
    color: "grey",
    fontSize: "1.1rem",
    alignSelf: "center",
  },
  searchInput: {
    flex: 1,
    border: "none",
    fontSize: "0.85rem",
    color: theme.palette.text.primary,
    backgroundColor: "transparent",
  },
  badge: {
    right: "-4px",
    "& .MuiBadge-badge": {
      height: 16,
      minWidth: 16,
      padding: "0 4px",
      fontSize: "0.65rem",
    }
  },
  newTicketButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 600,
    padding: "4px 10px",
    fontSize: "0.75rem",
    minWidth: "fit-content",
  },
  closeAllButton: {
    borderRadius: 8,
    textTransform: "none",
    fontWeight: 600,
    padding: "4px 10px",
    fontSize: "0.75rem",
    minWidth: "fit-content",
  },
  queueSelectWrap: {
    marginLeft: 6,
    borderRadius: 12,
  },
}));

const TicketsManager = () => {
  const classes = useStyles();
  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");
  const { tabOpen, setTabOpen } = useTicketsContext();
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(() => {
    const saved = localStorage.getItem("showAllTickets");
    return saved ? JSON.parse(saved) : false;
  });
  const searchInputRef = useRef();
  const { user } = useContext(AuthContext);
  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupsCount, setGroupsCount] = useState(0);
  const userQueueIds = user.queues.map((q) => q.id);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [closeAllModalOpen, setCloseAllModalOpen] = useState(false);
  const [closeAllLoading, setCloseAllLoading] = useState(false);
  const [closeAllOptions, setCloseAllOptions] = useState({
    statusOpen: true,
    statusPending: true,
    includeGroups: false
  });

  useEffect(() => {
    if (user.profile.toUpperCase() === "ADMIN") {
      const saved = localStorage.getItem("showAllTickets");
      if (saved === null) {
        setShowAllTickets(true);
        localStorage.setItem("showAllTickets", JSON.stringify(true));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("showAllTickets", JSON.stringify(showAllTickets));
  }, [showAllTickets]);

  useEffect(() => {
    if (tab === "search") {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
      setSearchParam("");
    }
  }, [tab]);

  let searchTimeout;

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();
    clearTimeout(searchTimeout);
    if (searchedTerm === "") {
      setSearchParam(searchedTerm);
      setTab("open");
      return;
    }
    searchTimeout = setTimeout(() => {
      setSearchParam(searchedTerm);
    }, 500);
  };

  const handleChangeTab = (e, newValue) => {
    setTab(newValue);
  };

  const handleChangeTabOpen = (e, newValue) => {
    setTabOpen(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0, overflow: "hidden", display: "none" };
    }
    return { flex: 1 };
  };

  const handleCloseAllTickets = async () => {
    setCloseAllLoading(true);
    try {
      const { data } = await api.put("/tickets/close-all", closeAllOptions);
      toast.success(`${data.closedCount || 0} tickets fechados com sucesso!`);
      setCloseAllModalOpen(false);
    } catch (err) {
      toast.error("Erro ao fechar tickets");
      console.error(err);
    }
    setCloseAllLoading(false);
  };

  return (
    <Paper elevation={0} square className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(e) => setNewTicketModalOpen(false)}
      />
      <Paper square elevation={0} className={classes.ticketOptionsBox}>
        {tab === "search" ? (
          <div className={classes.serachInputWrapper}>
            <SearchIcon className={classes.searchIcon} />
            <InputBase
              className={classes.searchInput}
              inputRef={searchInputRef}
              placeholder={i18n.t("tickets.search.placeholder")}
              type="search"
              onChange={handleSearch}
            />
          </div>
        ) : (
          <div style={{ display: "flex", width: "100%", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Tabs
                value={tab}
                onChange={handleChangeTab}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="off"
              >
                <Tab
                  value={"open"}
                  label={i18n.t("tickets.tabs.open.title")}
                  classes={{ root: classes.tab, selected: classes.tabSelected }}
                />
                <Tab
                  value={"closed"}
                  label={i18n.t("tickets.tabs.closed.title")}
                  classes={{ root: classes.tab, selected: classes.tabSelected }}
                />
              </Tabs>
            </div>
            <IconButton size="small" onClick={() => setTab("search")}>
              <SearchIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              color="primary"
              onClick={() => setNewTicketModalOpen(true)}
            >
              <MoveToInboxIcon fontSize="small" />
            </IconButton>
          </div>
        )}
      </Paper>
      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
        <div style={{ backgroundColor: "white", padding: "8px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <Tabs
            value={tabOpen}
            onChange={handleChangeTabOpen}
            indicatorColor="transparent"
            textColor="primary"
            variant="scrollable"
            scrollButtons="off"
          >
            <Tab
              label={
                <Badge
                  className={classes.badge}
                  badgeContent={openCount}
                  color="primary"
                >
                  {i18n.t("ticketsList.assignedHeader")}
                </Badge>
              }
              value={"open"}
              classes={{ root: classes.ticketsSubTab, selected: classes.ticketsSubTabSelected }}
            />
            <Tab
              label={
                <Badge
                  className={classes.badge}
                  badgeContent={pendingCount}
                  color="secondary"
                >
                  {i18n.t("ticketsList.pendingHeader")}
                </Badge>
              }
              value={"pending"}
              classes={{ root: classes.ticketsSubTab, selected: classes.ticketsSubTabSelected }}
            />
            <Tab
              label={
                <Badge
                  className={classes.badge}
                  badgeContent={groupsCount}
                  color="secondary"
                >
                  {i18n.t("tickets.tabs.group.title") || "Grupos"}
                </Badge>
              }
              value={"groups"}
              classes={{ root: classes.ticketsSubTab, selected: classes.ticketsSubTabSelected }}
            />
          </Tabs>
        </div>
        <div className={classes.ticketsWrapper} style={{ flex: 1 }}>
          <TicketsList
            status="open"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle("open")}
            isGroup="false"
          />
          <TicketsList
            status="pending"
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle("pending")}
            isGroup="false"
          />
          <TicketsList
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setGroupsCount(val)}
            isGroup="true"
            style={applyPanelStyle("groups")}
          />
        </div>
      </TabPanel>
      <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
        />
      </TabPanel>
      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
        <TicketsList
          searchParam={searchParam}
          showAll={true}
          selectedQueueIds={selectedQueueIds}
        />
      </TabPanel>

      {/* Close All Tickets Confirmation Modal */}
      <Dialog open={closeAllModalOpen} onClose={() => setCloseAllModalOpen(false)}>
        <DialogTitle>Confirmar</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Selecione quais tickets deseja encerrar:
          </Typography>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={closeAllOptions.statusOpen}
                  onChange={(e) => setCloseAllOptions({ ...closeAllOptions, statusOpen: e.target.checked })}
                  color="primary"
                />
              }
              label={i18n.t("ticketsList.assignedHeader") + " (Abertos)"}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={closeAllOptions.statusPending}
                  onChange={(e) => setCloseAllOptions({ ...closeAllOptions, statusPending: e.target.checked })}
                  color="primary"
                />
              }
              label={i18n.t("ticketsList.pendingHeader") + " (Aguardando)"}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={closeAllOptions.includeGroups}
                  onChange={(e) => setCloseAllOptions({ ...closeAllOptions, includeGroups: e.target.checked })}
                  color="secondary"
                />
              }
              label={i18n.t("tickets.tabs.group.title") || "Grupos"}
            />
          </div>
          <Typography variant="caption" color="error" style={{ marginTop: 10, display: 'block' }}>
            Isso não poderá ser desfeito.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseAllModalOpen(false)} color="secondary" disabled={closeAllLoading}>
            Cancelar
          </Button>
          <Button onClick={handleCloseAllTickets} color="primary" variant="contained" disabled={closeAllLoading} startIcon={closeAllLoading ? <CircularProgress size={20} /> : null}>
            Fechar Todos
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TicketsManager;
