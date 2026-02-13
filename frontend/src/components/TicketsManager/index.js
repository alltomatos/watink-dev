import React, { useContext, useEffect, useRef, useState } from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import clsx from "clsx";
import Paper from "@material-ui/core/Paper";
import SearchIcon from "@material-ui/icons/Search";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import MoveToInboxIcon from "@material-ui/icons/MoveToInbox";
import CheckBoxIcon from "@material-ui/icons/CheckBox";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsList";
import TabPanel from "../TabPanel";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useTicketsContext } from "../../context/Tickets/TicketsContext";
import { useThemeContext } from "../../context/DarkMode";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import TicketsTagFilter from "../TicketsTagFilter";
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Checkbox, Typography } from "@material-ui/core";
import { toast } from "react-toastify";
import AddIcon from "@material-ui/icons/Add";
import FilterListIcon from "@material-ui/icons/FilterList";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import GroupIcon from "@material-ui/icons/Group";
import HourglassEmptyIcon from "@material-ui/icons/HourglassEmpty";
import AllInboxIcon from "@material-ui/icons/AllInbox";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import VisibilityIcon from "@material-ui/icons/Visibility";
import VisibilityOffIcon from "@material-ui/icons/VisibilityOff";
import ClearAllIcon from "@material-ui/icons/ClearAll";
import { IconButton, Tooltip, Popover } from "@material-ui/core";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
  },
  ticketsWrapperApple: {
    borderRadius: "0 0 24px 24px",
    backgroundColor: "transparent",
    border: "none",
    padding: "0 10px",
  },
  // --- Apple Style Header ---
  appleHeader: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px 16px",
    background: theme.palette.type === 'dark' 
      ? "rgba(30, 30, 30, 0.4)" 
      : "rgba(255, 255, 255, 0.5)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: "20px",
    margin: "0 10px 10px 10px",
    boxShadow: theme.palette.type === 'dark'
      ? "0 4px 20px 0 rgba(0, 0, 0, 0.2)"
      : "0 4px 20px 0 rgba(0, 0, 0, 0.05)",
    border: theme.palette.type === 'dark'
      ? "1px solid rgba(255, 255, 255, 0.05)"
      : "1px solid rgba(255, 255, 255, 0.2)",
    transition: "all 0.3s ease",
  },
  appleTopBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: "12px"
  },
  appleSegmentedContainer: {
    display: "flex",
    padding: "4px",
    backgroundColor: theme.palette.type === 'dark' 
      ? "rgba(255, 255, 255, 0.05)" 
      : "rgba(0, 0, 0, 0.05)",
    borderRadius: "16px",
    gap: "4px",
    position: "relative",
    flex: 1,
  },
  appleSegmentedButton: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "0.85rem",
    fontWeight: 600,
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
    color: theme.palette.text.secondary,
    border: "none",
    background: "none",
    outline: "none",
    "&:hover": {
      backgroundColor: "rgba(0, 0, 0, 0.02)",
    },
  },
  appleSegmentedActive: {
    backgroundColor: theme.palette.type === 'dark' 
      ? "rgba(255, 255, 255, 0.15)" 
      : "#ffffff",
    color: theme.palette.primary.main,
    boxShadow: theme.palette.type === 'dark'
      ? "none"
      : "0 2px 8px rgba(0, 0, 0, 0.12)",
    transform: "scale(1.02)",
  },
  appleIconBtn: {
    padding: "10px",
    borderRadius: "14px",
    minWidth: "auto",
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.type === 'dark' 
      ? "rgba(255, 255, 255, 0.05)" 
      : "rgba(0, 0, 0, 0.03)",
    "&:hover": {
      backgroundColor: theme.palette.type === 'dark' 
        ? "rgba(255, 255, 255, 0.1)" 
        : "rgba(0, 0, 0, 0.06)",
    },
  },
  appleSearchWrapper: {
    display: "flex",
    alignItems: "center",
    backgroundColor: theme.palette.type === 'dark' 
      ? "rgba(255, 255, 255, 0.05)" 
      : "rgba(0, 0, 0, 0.05)",
    borderRadius: "14px",
    padding: "4px 12px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    width: "44px",
    height: "44px",
    overflow: "hidden",
    cursor: "pointer",
    "&.expanded": {
      width: "100%",
      backgroundColor: theme.palette.type === 'dark' 
        ? "rgba(255, 255, 255, 0.1)" 
        : "rgba(0, 0, 0, 0.03)",
    }
  },
  appleSearchInput: {
    marginLeft: "8px",
    flex: 1,
    fontSize: "0.95rem",
    color: theme.palette.text.primary,
    "& input::placeholder": {
      opacity: 0.6,
    }
  },
  appleCounter: {
    fontSize: "0.6rem",
    padding: "1px 4px",
    borderRadius: "50%",
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    minWidth: "14px",
    height: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    position: "absolute",
    top: "2px",
    right: "4px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    border: `1.5px solid ${theme.palette.type === 'dark' ? '#333' : '#fff'}`,
  },
  appleCounterSecondary: {
    backgroundColor: theme.palette.secondary.main,
  },
  // --- End Apple Style ---
  tabsHeader: {
    flex: "none",
    backgroundColor: theme.palette.background.paper,
  },
  tabsHeaderApple: {
    display: "none",
  },
  settingsIcon: {
    alignSelf: "center",
    marginLeft: "auto",
    padding: 8,
  },
  tab: {
    minWidth: 120,
    width: 120,
  },
  ticketOptionsBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: theme.palette.background.paper,
    padding: theme.spacing(1),
  },
  ticketOptionsBoxApple: {
    display: "none",
  },
  serachInputWrapper: {
    flex: 1,
    background: theme.palette.type === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
    display: "flex",
    borderRadius: 12,
    padding: "6px 12px",
    marginRight: theme.spacing(1),
    transition: "all 0.2s",
    "&:focus-within": {
      background: theme.palette.background.paper,
      boxShadow: "0 0 0 3px rgba(0, 122, 255, 0.2)",
    }
  },
  searchIcon: {
    color: "grey",
    marginLeft: 6,
    marginRight: 6,
    alignSelf: "center",
  },
  searchInput: {
    flex: 1,
    border: "none",
    borderRadius: 30,
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.default,
  },
  whaticketHeader: {
    display: "flex",
    flexDirection: "column",
    padding: "12px 16px 10px",
    gap: 10,
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  whaticketTopRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  whaticketActions: {
    marginLeft: "auto",
    display: "flex",
    gap: 4,
  },
  whaticketSearchWrapper: {
    display: "flex",
    alignItems: "center",
    backgroundColor: theme.palette.action.hover,
    borderRadius: 12,
    padding: "8px 12px",
    border: `1px solid ${theme.palette.divider}`,
    transition: "all .2s ease",
    "&:focus-within": {
      boxShadow: `0 0 0 3px ${theme.palette.action.focus}`,
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.background.paper,
    },
  },
  whaticketSearchInput: {
    marginLeft: "10px",
    flex: 1,
    fontSize: "0.9rem",
    color: theme.palette.text.primary,
  },
  whaticketTabContainer: {
    display: "flex",
    gap: "8px",
    padding: "2px 0",
  },
  whaticketTab: {
    padding: "7px 13px",
    borderRadius: "999px",
    fontSize: "0.84rem",
    cursor: "pointer",
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.text.secondary,
    border: `1px solid ${theme.palette.divider}`,
    transition: "all .2s ease",
    "&.active": {
      backgroundColor: theme.palette.action.selected,
      color: theme.palette.primary.main,
      borderColor: theme.palette.primary.main,
      fontWeight: 600,
    },
  },
  whatsappHeader: {
    display: "flex",
    flexDirection: "column",
    padding: "10px 16px",
    backgroundColor: theme.palette.background.paper,
  },
  whatsappSearchWrapper: {
    display: "flex",
    alignItems: "center",
    backgroundColor: theme.palette.type === 'dark' ? "#202C33" : "#F0F2F5",
    borderRadius: "10px",
    padding: "6px 12px",
    marginBottom: "8px",
  },
  whatsappSearchInput: {
    marginLeft: "12px",
    flex: 1,
    fontSize: "0.9rem",
    color: theme.palette.text.primary,
  },
  whatsappTabContainer: {
    display: "flex",
    gap: "8px",
    padding: "4px 0",
  },
  whatsappTab: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "0.85rem",
    cursor: "pointer",
    backgroundColor: theme.palette.type === 'dark' ? "#202C33" : "#F0F2F5",
    color: theme.palette.text.secondary,
    border: "none",
    "&.active": {
      backgroundColor: theme.palette.type === 'dark' ? "#005C4B" : "#D9FDD3",
      color: theme.palette.type === 'dark' ? "#00A884" : "#008069",
      fontWeight: 600,
    }
  },
  badge: {
    right: "-10px",
  },
  show: {
    display: "block",
  },
  hide: {
    display: "none !important",
  },
}));

const TicketsManager = () => {
  const classes = useStyles();
  const theme = useTheme();
  const { appTheme } = useThemeContext();
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
  const [selectedTags, setSelectedTags] = useState([]);
  const [closeAllModalOpen, setCloseAllModalOpen] = useState(false);
  const [closeAllLoading, setCloseAllLoading] = useState(false);
  const [closeAllOptions, setCloseAllOptions] = useState({
    statusOpen: true,
    statusPending: true,
    includeGroups: false
  });

  // Apple UI States
  const [anchorElQueue, setAnchorElQueue] = useState(null);
  const [anchorElTag, setAnchorElTag] = useState(null);

  useEffect(() => {
    if (user.profile && user.profile.toUpperCase() === "ADMIN") {
      const saved = localStorage.getItem("showAllTickets");
      if (saved === null) {
        setShowAllTickets(true);
        localStorage.setItem("showAllTickets", JSON.stringify(true));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem("showAllTickets", JSON.stringify(showAllTickets));
  }, [showAllTickets]);

  let searchTimeout;

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();

    clearTimeout(searchTimeout);

    if (searchedTerm === "") {
      setSearchParam(searchedTerm);
      return;
    }

    searchTimeout = setTimeout(() => {
      setSearchParam(searchedTerm);
    }, 500);
  };

  const handleChangeTab = (newValue) => {
    setTab(newValue);
    if (newValue !== "search") {
        setSearchParam("");
    }
  };

  const handleChangeTabOpen = (newValue) => {
    setTabOpen(newValue);
  };

  const applyPanelStyle = (status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0 };
    }
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

  const renderAppleHeader = () => (
    <div className={classes.appleHeader}>
      <div className={classes.appleTopBar}>
        {tab === "open" && (
          <div className={classes.appleSegmentedContainer} style={{ flex: 1, backgroundColor: 'transparent', padding: 0 }}>
            <button
              className={clsx(classes.appleSegmentedButton, tabOpen === "open" && classes.appleSegmentedActive)}
              onClick={() => handleChangeTabOpen("open")}
              style={{ borderRadius: '14px' }}
            >
              <MoveToInboxIcon fontSize="small" />
              <span style={{ fontSize: '0.85rem' }}>Abertos</span>
              {openCount > 0 && <span className={classes.appleCounter}>{openCount}</span>}
            </button>
            <button
              className={clsx(classes.appleSegmentedButton, tabOpen === "pending" && classes.appleSegmentedActive)}
              onClick={() => handleChangeTabOpen("pending")}
              style={{ borderRadius: '14px' }}
            >
              <HourglassEmptyIcon fontSize="small" />
              <span style={{ fontSize: '0.85rem' }}>Aguardando</span>
              {pendingCount > 0 && <span className={clsx(classes.appleCounter, classes.appleCounterSecondary)}>{pendingCount}</span>}
            </button>
            <button
              className={clsx(classes.appleSegmentedButton, tabOpen === "groups" && classes.appleSegmentedActive)}
              onClick={() => handleChangeTabOpen("groups")}
              style={{ borderRadius: '14px' }}
            >
              <GroupIcon fontSize="small" />
              <span style={{ fontSize: '0.85rem' }}>Grupos</span>
              {groupsCount > 0 && <span className={clsx(classes.appleCounter, classes.appleCounterSecondary)}>{groupsCount}</span>}
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
          <Can
            user={user}
            perform="tickets-manager:showall"
            yes={() => (
              <Tooltip title={showAllTickets ? "Ocultar Outros" : "Mostrar Todos"}>
                <IconButton 
                  className={classes.appleIconBtn} 
                  onClick={() => setShowAllTickets(prev => !prev)}
                  style={{ color: showAllTickets ? theme.palette.primary.main : 'inherit', padding: 8 }}
                >
                  {showAllTickets ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          />
          <Can
            user={user}
            perform="tickets-manager:showall"
            yes={() => (
              <Tooltip title="Fechar Todos">
                <IconButton className={classes.appleIconBtn} onClick={() => setCloseAllModalOpen(true)} style={{ padding: 8 }}>
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          />
          <IconButton className={classes.appleIconBtn} onClick={(e) => setAnchorElQueue(e.currentTarget)} style={{ padding: 8 }}>
            <FilterListIcon fontSize="small" />
          </IconButton>
          <IconButton className={classes.appleIconBtn} onClick={(e) => setAnchorElTag(e.currentTarget)} style={{ padding: 8 }}>
            <LocalOfferIcon fontSize="small" />
          </IconButton>
          
          <Popover
            open={Boolean(anchorElQueue)}
            anchorEl={anchorElQueue}
            onClose={() => setAnchorElQueue(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              style: { 
                borderRadius: "20px", 
                padding: "16px", 
                marginTop: "12px",
                minWidth: "250px",
                backdropFilter: "blur(20px)",
                backgroundColor: theme.palette.type === 'dark' ? "rgba(30,30,30,0.85)" : "rgba(255,255,255,0.85)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                border: theme.palette.type === 'dark' ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.2)"
              }
            }}
          >
            <TicketsQueueSelect
              selectedQueueIds={selectedQueueIds}
              userQueues={user?.queues}
              onChange={(values) => setSelectedQueueIds(values)}
            />
          </Popover>

          <Popover
            open={Boolean(anchorElTag)}
            anchorEl={anchorElTag}
            onClose={() => setAnchorElTag(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              style: { 
                borderRadius: "20px", 
                padding: "16px", 
                marginTop: "12px",
                minWidth: "250px",
                backdropFilter: "blur(20px)",
                backgroundColor: theme.palette.type === 'dark' ? "rgba(30,30,30,0.85)" : "rgba(255,255,255,0.85)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                border: theme.palette.type === 'dark' ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.2)"
              }
            }}
          >
            <TicketsTagFilter
              selectedTags={selectedTags}
              onChange={(values) => setSelectedTags(values)}
            />
          </Popover>
        </div>
      </div>
    </div>
  );

  const renderWhaticketHeader = () => (
    <div className={classes.whaticketHeader}>
      <div className={classes.whaticketTopRow}>
        <div className={classes.whaticketSearchWrapper} style={{ flex: 1 }}>
          <SearchIcon fontSize="small" color="action" />
          <InputBase
            className={classes.whaticketSearchInput}
            placeholder={i18n.t("tickets.search.placeholder")}
            onChange={handleSearch}
          />
        </div>

        <div className={classes.whaticketActions}>
          <Tooltip title={i18n.t("ticketsManager.buttons.newTicket")}>
            <IconButton size="small" onClick={() => setNewTicketModalOpen(true)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Can
            user={user}
            perform="tickets-manager:showall"
            yes={() => (
              <Tooltip title={showAllTickets ? "Ocultar Outros" : "Mostrar Todos"}>
                <IconButton size="small" onClick={() => setShowAllTickets(prev => !prev)}>
                  {showAllTickets ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
          />

          <Can
            user={user}
            perform="tickets-manager:showall"
            yes={() => (
              <Tooltip title="Fechar Todos">
                <IconButton size="small" onClick={() => setCloseAllModalOpen(true)}>
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          />

          <Tooltip title="Filtrar por filas">
            <IconButton size="small" onClick={(e) => setAnchorElQueue(e.currentTarget)}>
              <FilterListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Filtrar por tags">
            <IconButton size="small" onClick={(e) => setAnchorElTag(e.currentTarget)}>
              <LocalOfferIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      <div className={classes.whaticketTabContainer}>
        <button className={clsx(classes.whaticketTab, tab === "open" && "active")} onClick={() => handleChangeTab("open")}>Abertos</button>
        <button className={clsx(classes.whaticketTab, tab === "closed" && "active")} onClick={() => handleChangeTab("closed")}>Resolvidos</button>
        <button className={clsx(classes.whaticketTab, tab === "search" && "active")} onClick={() => handleChangeTab("search")}>Busca</button>
      </div>

      <Popover
        open={Boolean(anchorElQueue)}
        anchorEl={anchorElQueue}
        onClose={() => setAnchorElQueue(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          style: {
            borderRadius: 14,
            padding: "12px 14px",
            marginTop: 8,
            minWidth: 250,
          }
        }}
      >
        <TicketsQueueSelect
          selectedQueueIds={selectedQueueIds}
          userQueues={user?.queues}
          onChange={(values) => setSelectedQueueIds(values)}
        />
      </Popover>

      <Popover
        open={Boolean(anchorElTag)}
        anchorEl={anchorElTag}
        onClose={() => setAnchorElTag(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          style: {
            borderRadius: 14,
            padding: "12px 14px",
            marginTop: 8,
            minWidth: 250,
          }
        }}
      >
        <TicketsTagFilter
          selectedTags={selectedTags}
          onChange={(values) => setSelectedTags(values)}
        />
      </Popover>
    </div>
  );

  const renderWhatsappHeader = () => (
    <div className={classes.whatsappHeader}>
      <div className={classes.whatsappSearchWrapper}>
        <SearchIcon fontSize="small" style={{ color: "#8696A0" }} />
        <InputBase
          className={classes.whatsappSearchInput}
          placeholder="Pesquisar ou começar uma nova conversa"
          onChange={handleSearch}
        />
      </div>
      <div className={classes.whatsappTabContainer}>
        <button 
          className={clsx(classes.whatsappTab, tab === "open" && "active")}
          onClick={() => handleChangeTab("open")}
        >
          Conversas
        </button>
        <button 
          className={clsx(classes.whatsappTab, tab === "closed" && "active")}
          onClick={() => handleChangeTab("closed")}
        >
          Resolvidos
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
            <IconButton size="small" onClick={() => setNewTicketModalOpen(true)}>
                <AddIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={(e) => setAnchorElQueue(e.currentTarget)}>
                <FilterListIcon fontSize="small" />
            </IconButton>
        </div>
      </div>
    </div>
  );

  return (
    <Paper elevation={0} variant="outlined" className={clsx(classes.ticketsWrapper, appTheme === "apple" && classes.ticketsWrapperApple)}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={(e) => setNewTicketModalOpen(false)}
      />

      {appTheme === "apple" ? renderAppleHeader() : appTheme === "whatsapp" ? renderWhatsappHeader() : appTheme === "whaticket" ? renderWhaticketHeader() : (
        <>
          <Paper elevation={0} square className={clsx(classes.tabsHeader, appTheme === "apple" && classes.tabsHeaderApple)}>
            <Tabs
              value={tab}
              onChange={(e, v) => handleChangeTab(v)}
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
              aria-label="icon label tabs example"
            >
              <Tab
                value={"open"}
                icon={<MoveToInboxIcon />}
                label={i18n.t("tickets.tabs.open.title")}
                classes={{ root: classes.tab }}
              />
              <Tab
                value={"closed"}
                icon={<CheckBoxIcon />}
                label={i18n.t("tickets.tabs.closed.title")}
                classes={{ root: classes.tab }}
              />
              <Tab
                value={"search"}
                icon={<SearchIcon />}
                label={i18n.t("tickets.tabs.search.title")}
                classes={{ root: classes.tab }}
              />
            </Tabs>
          </Paper>
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
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => setNewTicketModalOpen(true)}
                >
                  {i18n.t("ticketsManager.buttons.newTicket")}
                </Button>
                <Can
                  user={user}
                  perform="tickets-manager:showall"
                  yes={() => (
                    <Button
                      variant="outlined"
                      color="secondary"
                      style={{ marginLeft: 6 }}
                      onClick={() => setCloseAllModalOpen(true)}
                    >
                      Fechar Todos
                    </Button>
                  )}
                />
                <Can
                  user={user}
                  perform="tickets-manager:showall"
                  yes={() => (
                    <FormControlLabel
                      label={i18n.t("tickets.buttons.showAll")}
                      labelPlacement="start"
                      control={
                        <Switch
                          size="small"
                          checked={showAllTickets}
                          onChange={() =>
                            setShowAllTickets((prevState) => !prevState)
                          }
                          name="showAllTickets"
                          color="primary"
                        />
                      }
                    />
                  )}
                />
              </>
            )}
            <TicketsQueueSelect
              style={{ marginLeft: 6 }}
              selectedQueueIds={selectedQueueIds}
              userQueues={user?.queues}
              onChange={(values) => setSelectedQueueIds(values)}
            />
            <TicketsTagFilter
              selectedTags={selectedTags}
              onChange={(values) => setSelectedTags(values)}
            />
          </Paper>
        </>
      )}

      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
        {(appTheme !== "apple" && appTheme !== "whatsapp") && (
            <Tabs
              value={tabOpen}
              onChange={(e, v) => handleChangeTabOpen(v)}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
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
              />
            </Tabs>
        )}
        {appTheme === "whatsapp" && tab === "open" && (
            <div style={{ display: "flex", padding: "8px 16px", gap: "10px", backgroundColor: theme.palette.background.paper, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Typography 
                    onClick={() => handleChangeTabOpen("open")}
                    style={{ 
                        fontSize: "0.85rem", 
                        cursor: "pointer", 
                        fontWeight: tabOpen === "open" ? 600 : 400,
                        color: tabOpen === "open" ? theme.palette.primary.main : theme.palette.text.secondary,
                        borderBottom: tabOpen === "open" ? `2px solid ${theme.palette.primary.main}` : "none",
                        paddingBottom: "4px"
                    }}
                >
                    Meus ({openCount})
                </Typography>
                <Typography 
                    onClick={() => handleChangeTabOpen("pending")}
                    style={{ 
                        fontSize: "0.85rem", 
                        cursor: "pointer", 
                        fontWeight: tabOpen === "pending" ? 600 : 400,
                        color: tabOpen === "pending" ? theme.palette.primary.main : theme.palette.text.secondary,
                        borderBottom: tabOpen === "pending" ? `2px solid ${theme.palette.primary.main}` : "none",
                        paddingBottom: "4px"
                    }}
                >
                    Aguardando ({pendingCount})
                </Typography>
                <Typography 
                    onClick={() => handleChangeTabOpen("groups")}
                    style={{ 
                        fontSize: "0.85rem", 
                        cursor: "pointer", 
                        fontWeight: tabOpen === "groups" ? 600 : 400,
                        color: tabOpen === "groups" ? theme.palette.primary.main : theme.palette.text.secondary,
                        borderBottom: tabOpen === "groups" ? `2px solid ${theme.palette.primary.main}` : "none",
                        paddingBottom: "4px"
                    }}
                >
                    Grupos ({groupsCount})
                </Typography>
            </div>
        )}
        <Paper className={clsx(classes.ticketsWrapper, (appTheme === "apple" || appTheme === "whatsapp") && classes.ticketsWrapperApple)}>
          <TicketsList
            status="open"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle("open")}
            isGroup="false"
            tags={selectedTags}
          />
          <TicketsList
            status="pending"
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle("pending")}
            isGroup="false"
            tags={selectedTags}
          />
          <TicketsList
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setGroupsCount(val)}
            isGroup="true"
            style={applyPanelStyle("groups")}
            tags={selectedTags}
          />
        </Paper>
      </TabPanel>
      <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          tags={selectedTags}
        />
      </TabPanel>
      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
        <TicketsList
          searchParam={searchParam}
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          tags={selectedTags}
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
          <Button
            onClick={() => setCloseAllModalOpen(false)}
            color="secondary"
            disabled={closeAllLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCloseAllTickets}
            color="primary"
            variant="contained"
            disabled={closeAllLoading}
            startIcon={closeAllLoading ? <CircularProgress size={20} /> : null}
          >
            Fechar Todos
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TicketsManager;
