import React, { useState, useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";
import clsx from "clsx";
import {
    makeStyles,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    MenuItem,
    Menu,
    IconButton,
    Box,
    Avatar,
    InputBase,
    useTheme,
} from "@material-ui/core";
import AccountCircle from "@material-ui/icons/AccountCircle";
import MenuIcon from "@material-ui/icons/Menu";
import SearchIcon from "@material-ui/icons/Search";
import AllInboxIcon from "@material-ui/icons/AllInbox";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import AddIcon from "@material-ui/icons/Add";
import { Tooltip } from "@material-ui/core";

import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import { AuthContext } from "../context/Auth/AuthContext";
import { useTicketsContext } from "../context/Tickets/TicketsContext";
import { useThemeContext } from "../context/DarkMode";
import BackdropLoading from "../components/BackdropLoading";
import { i18n } from "../translate/i18n";
import VersionFooter from "../components/VersionFooter";
import api from "../services/api";
import { getBackendUrl } from "../helpers/urlUtils";
import { motion } from "framer-motion";

const drawerWidth = 280;
const drawerWidthClosed = 88;

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        height: "100vh",
        backgroundColor: "transparent",
        backgroundImage: props => props.appTheme === 'whatsapp' 
            ? (theme.palette.type === 'dark' 
                ? "linear-gradient(180deg, #0B141A 0%, #111B21 100%)" 
                : "linear-gradient(180deg, #EEF3F7 0%, #E6EDF2 100%)")
            : "none",
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        overflow: "hidden",
    },
    // Floating Sidebar Style
    drawerPaper: {
        position: "fixed",
        top: props => props.appTheme === 'whatsapp' ? 0 : 20,
        left: props => props.appTheme === 'whatsapp' ? 0 : 20,
        bottom: props => props.appTheme === 'whatsapp' ? 0 : 20,
        whiteSpace: "nowrap",
        width: drawerWidth,
        transition: theme.transitions.create(["width", "transform"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
        border: props => props.appTheme === 'whatsapp' ? `1px solid ${theme.palette.divider}` : (theme.palette.type === "dark"
            ? "1px solid rgba(255, 255, 255, 0.05)"
            : "1px solid rgba(255, 255, 255, 0.4)"),
        backgroundColor: props => props.appTheme === 'whatsapp'
            ? (theme.palette.type === 'dark' ? "#111B21" : "#F8FBFD")
            : (theme.palette.type === "dark" ? "rgba(30, 30, 35, 0.7)" : "rgba(255, 255, 255, 0.75)"),
        backdropFilter: props => props.appTheme === 'whatsapp' ? "none" : "blur(40px) saturate(180%)",
        WebkitBackdropFilter: props => props.appTheme === 'whatsapp' ? "none" : "blur(40px) saturate(180%)",
        color: theme.palette.text.primary,
        borderRadius: props => props.appTheme === 'whatsapp' ? 0 : 24,
        boxShadow: props => props.appTheme === 'whatsapp' 
            ? "none" 
            : (theme.palette.type === "dark"
                ? "0 20px 50px rgba(0,0,0,0.4)"
                : "0 20px 50px rgba(0, 0, 0, 0.08)"),
        display: "flex",
        flexDirection: "column",
        zIndex: theme.zIndex.drawer + 2,
        margin: 0,
        height: props => props.appTheme === 'whatsapp' ? "100%" : "calc(100% - 40px)",
        overflow: "hidden",
    },
    drawerPaperClose: {
        width: drawerWidthClosed,
        transition: theme.transitions.create(["width", "transform"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        overflowX: "hidden",
    },
    // Floating AppBar
    appBar: {
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(["width", "margin", "left"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        backgroundColor: props => props.appTheme === 'whatsapp' 
            ? (theme.palette.type === "dark" ? "rgba(17, 27, 33, 0.92)" : "rgba(255, 255, 255, 0.94)")
            : (theme.palette.type === "dark" ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.6)"),
        backdropFilter: props => props.appTheme === 'whatsapp' ? "none" : "blur(30px) saturate(180%)",
        WebkitBackdropFilter: props => props.appTheme === 'whatsapp' ? "none" : "blur(30px) saturate(180%)",
        boxShadow: props => props.appTheme === 'whatsapp' 
            ? "none" 
            : (theme.palette.type === "dark"
                ? "0 10px 40px rgba(0, 0, 0, 0.4)"
                : "0 10px 40px rgba(0, 0, 0, 0.05)"),
        border: props => props.appTheme === 'whatsapp' ? `1px solid ${theme.palette.divider}` : (theme.palette.type === "dark"
            ? "1px solid rgba(255, 255, 255, 0.05)"
            : "1px solid rgba(255, 255, 255, 0.3)"),
        color: theme.palette.text.primary,
        borderRadius: props => props.appTheme === 'whatsapp' ? 0 : 24,
        top: props => props.appTheme === 'whatsapp' ? 0 : 20,
        right: props => props.appTheme === 'whatsapp' ? 0 : 20,
        left: props => props.appTheme === 'whatsapp' 
            ? (props.drawerOpen ? drawerWidth : drawerWidthClosed) 
            : (props.drawerOpen ? drawerWidth + 40 : drawerWidthClosed + 40),
        width: props => props.appTheme === 'whatsapp' 
            ? `calc(100% - ${props.drawerOpen ? drawerWidth : drawerWidthClosed}px)` 
            : `calc(100% - ${props.drawerOpen ? drawerWidth + 60 : drawerWidthClosed + 60}px)`,
        margin: 0,
    },
    appBarShift: {
        // dynamic handled by appBar props
    },
    appBarCollapsed: {
        // dynamic handled by appBar props
    },
    // Ticket Controls in Header
    headerControls: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flex: 1,
        justifyContent: "center",
        padding: "0 20px",
    },
    appleSegmentedContainer: {
        display: "flex",
        padding: "4px",
        backgroundColor: theme.palette.type === 'dark' 
          ? "rgba(255, 255, 255, 0.05)" 
          : "rgba(0, 0, 0, 0.05)",
        borderRadius: "16px",
        gap: "4px",
    },
    appleSegmentedButton: {
        padding: "6px 16px",
        borderRadius: "12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontSize: "0.85rem",
        fontWeight: 600,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
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
    },
    appleSearchWrapper: {
        display: "flex",
        alignItems: "center",
        backgroundColor: theme.palette.type === 'dark' 
          ? "rgba(255, 255, 255, 0.05)" 
          : "rgba(0, 0, 0, 0.05)",
        borderRadius: "14px",
        padding: "4px 12px",
        transition: "all 0.3s ease",
        width: "180px",
        "&:focus-within": {
            width: "240px",
            backgroundColor: theme.palette.type === 'dark' 
                ? "rgba(255, 255, 255, 0.1)" 
                : "rgba(255, 255, 255, 0.9)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }
    },
    appleSearchInput: {
        marginLeft: "8px",
        flex: 1,
        fontSize: "0.85rem",
    },
    appleIconBtn: {
        padding: "8px",
        borderRadius: "12px",
        backgroundColor: theme.palette.type === 'dark' 
          ? "rgba(255, 255, 255, 0.05)" 
          : "rgba(0, 0, 0, 0.03)",
        "&:hover": {
          backgroundColor: theme.palette.type === 'dark' 
            ? "rgba(255, 255, 255, 0.1)" 
            : "rgba(0, 0, 0, 0.06)",
        },
    },
    toolbar: {
        paddingRight: 16,
        paddingLeft: 16,
        display: "flex",
        justifyContent: "space-between",
        minHeight: 64,
    },
    content: {
        flexGrow: 1,
        height: "100vh",
        overflow: "auto",
        padding: props => props.appTheme === 'whatsapp' ? "64px 0 0 0" : "104px 20px 20px 20px", 
        marginLeft: props => props.appTheme === 'whatsapp' 
            ? (props.drawerOpen ? drawerWidth : drawerWidthClosed)
            : drawerWidth + 20,
        transition: theme.transitions.create(["margin-left"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    contentShift: {
        marginLeft: props => props.appTheme === 'whatsapp' 
            ? drawerWidthClosed
            : drawerWidthClosed + 20,
        transition: theme.transitions.create(["margin-left"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
    },
    logoContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 100,
        padding: "20px",
    },
    logoText: {
        fontWeight: 700,
        fontSize: "1.4rem",
        letterSpacing: "-0.5px",
        fontFamily: "'Inter', sans-serif",
        background: theme.palette.type === 'dark' 
            ? "linear-gradient(180deg, #FFFFFF 0%, #A1A1AA 100%)"
            : "linear-gradient(180deg, #18181B 0%, #71717A 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
    },
    systemLogo: {
        maxWidth: "80%",
        maxHeight: 60,
        objectFit: "contain",
        filter: theme.palette.type === 'dark' ? "drop-shadow(0 0 8px rgba(255,255,255,0.2))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",
    },
    userActions: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    avatar: {
        width: 36,
        height: 36,
        border: `2px solid ${theme.palette.background.paper}`,
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    }
}));

const MainLayoutApple = ({ children }) => {
    const theme = useTheme();
    const { appTheme } = useThemeContext();
    const [drawerOpen, setDrawerOpen] = useState(true);
    const classes = useStyles({ appTheme, drawerOpen });
    const history = useHistory();

    useEffect(() => {
        if (appTheme === 'whatsapp') {
            setDrawerOpen(false);
        }
    }, [appTheme]);
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const { handleLogout, loading, user } = useContext(AuthContext);
    const { tab, setTab, searchParam, setSearchParam, setNewTicketModalOpen } = useTicketsContext();
    const [drawerVariant, setDrawerVariant] = useState("permanent");
    const [systemLogo, setSystemLogo] = useState("");
    const [systemTitle, setSystemTitle] = useState("Watink");
    const [logoEnabled, setLogoEnabled] = useState(true);

    const isTicketsPage = history.location.pathname.startsWith("/tickets");

    useEffect(() => {
        if (document.body.offsetWidth > 600) {
            // setDrawerOpen(appTheme === 'whatsapp' ? false : true);
        } else {
            setDrawerOpen(false);
        }
    }, [appTheme]);

    useEffect(() => {
        if (document.body.offsetWidth < 600) {
            setDrawerVariant("temporary");
        } else {
            setDrawerVariant("permanent");
        }
    }, [drawerOpen]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get("/settings");
                const logoSetting = data.find(s => s.key === "systemLogo");
                const titleSetting = data.find(s => s.key === "systemTitle");
                const logoEnabledSetting = data.find(s => s.key === "systemLogoEnabled");

                if (logoSetting && logoSetting.value) setSystemLogo(logoSetting.value);
                if (titleSetting && titleSetting.value) {
                    setSystemTitle(titleSetting.value);
                    document.title = titleSetting.value;
                }
                if (logoEnabledSetting) setLogoEnabled(logoEnabledSetting.value === "true");
            } catch (err) {
                console.error("Error fetching settings:", err);
            }
        };
        fetchSettings();
    }, []);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
        setMenuOpen(true);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setMenuOpen(false);
    };

    const handleClickLogout = () => {
        handleCloseMenu();
        handleLogout();
    };

    const drawerClose = () => {
        if (document.body.offsetWidth < 600) {
            setDrawerOpen(false);
        }
    };

    const [localSearch, setLocalSearch] = useState("");

    useEffect(() => {
        if (searchParam === "" && localSearch !== "") {
            setLocalSearch("");
        }
    }, [searchParam, localSearch]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (localSearch !== searchParam) {
                setSearchParam(localSearch);
                if (localSearch !== "" && tab !== "search") {
                    setTab("search");
                } else if (localSearch === "" && tab === "search") {
                    setTab("open");
                }
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [localSearch, searchParam, tab, setTab, setSearchParam]);

    const handleSearch = (e) => {
        setLocalSearch(e.target.value);
    };

    const handleTabChange = (newTab) => {
        setTab(newTab);
        if (newTab !== "search") {
            setLocalSearch("");
            setSearchParam("");
        }
    };

    if (loading) return <BackdropLoading />;

    return (
        <div className={classes.root}>
            <Drawer
                variant={drawerVariant}
                PaperProps={{ elevation: 0 }}
                classes={{
                    paper: clsx(classes.drawerPaper, !drawerOpen && classes.drawerPaperClose),
                }}
                open={drawerOpen}
            >
                <Box className={classes.logoContainer}>
                    {drawerOpen && systemLogo && logoEnabled ? (
                        <img src={getBackendUrl(systemLogo)} alt="Logo" className={classes.systemLogo} />
                    ) : drawerOpen && systemTitle ? (
                        <Typography className={classes.logoText} noWrap>
                            {systemTitle}
                        </Typography>
                    ) : (
                         <Box style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(45deg, #007AFF, #5856D6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                            {systemTitle.charAt(0)}
                         </Box>
                    )}
                </Box>
                
                <List style={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden", padding: appTheme === 'whatsapp' ? 0 : "0 12px" }}>
                    <MainListItems drawerClose={drawerClose} collapsed={!drawerOpen} />
                </List>
                
                {appTheme !== 'whatsapp' && <Divider style={{ margin: "0 20px", opacity: 0.1 }} />}
                <VersionFooter collapsed={!drawerOpen} />
            </Drawer>

            <AppBar
                position="fixed"
                className={clsx(
                    classes.appBar,
                    drawerOpen ? classes.appBarShift : classes.appBarCollapsed
                )}
            >
                <Toolbar className={classes.toolbar}>
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: appTheme === 'whatsapp' ? 100 : 200 }}>
                        <IconButton
                            edge="start"
                            color="inherit"
                            onClick={() => setDrawerOpen(!drawerOpen)}
                            className={classes.menuButton}
                        >
                            <MenuIcon />
                        </IconButton>
                        {(!isTicketsPage || appTheme !== 'whatsapp') && (
                            <Typography variant="h6" style={{ fontWeight: 600, letterSpacing: -0.5 }}>
                                {isTicketsPage ? "Tickets" : systemTitle}
                            </Typography>
                        )}
                    </div>

                    {isTicketsPage && (
                        <div className={classes.headerControls}>
                            <div className={classes.appleSegmentedContainer}>
                                <button
                                    className={clsx(classes.appleSegmentedButton, (tab === "open" || tab === "search") && classes.appleSegmentedActive)}
                                    onClick={() => handleTabChange("open")}
                                >
                                    <AllInboxIcon fontSize="small" />
                                    <span>{i18n.t("tickets.tabs.open.title")}</span>
                                </button>
                                <button
                                    className={clsx(classes.appleSegmentedButton, tab === "closed" && classes.appleSegmentedActive)}
                                    onClick={() => handleTabChange("closed")}
                                >
                                    <DoneAllIcon fontSize="small" />
                                    <span>{i18n.t("tickets.tabs.closed.title")}</span>
                                </button>
                            </div>

                            <div className={classes.appleSearchWrapper}>
                                <SearchIcon style={{ color: localSearch ? '#007AFF' : 'inherit', fontSize: 20 }} />
                                <InputBase
                                    className={classes.appleSearchInput}
                                    placeholder={i18n.t("tickets.search.placeholder")}
                                    value={localSearch}
                                    onChange={handleSearch}
                                />
                            </div>

                            <Tooltip title={i18n.t("ticketsManager.buttons.newTicket")}>
                                <IconButton className={classes.appleIconBtn} onClick={() => setNewTicketModalOpen(true)}>
                                    <AddIcon />
                                </IconButton>
                            </Tooltip>
                        </div>
                    )}

                    <div className={classes.userActions}>
                        {user.id && <NotificationsPopOver />}

                        <IconButton onClick={handleMenu} color="inherit" style={{ padding: 4 }}>
                            {user.profileImage ? (
                                <Avatar
                                    alt={user.name}
                                    src={getBackendUrl(user.profileImage)}
                                    className={classes.avatar}
                                />
                            ) : (
                                <Avatar className={classes.avatar} style={{ backgroundColor: '#007AFF' }}>
                                    <AccountCircle />
                                </Avatar>
                            )}
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            keepMounted
                            open={menuOpen}
                            onClose={handleCloseMenu}
                            PaperProps={{
                                style: {
                                    borderRadius: 16,
                                    marginTop: 10,
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                                    backdropFilter: 'blur(20px)',
                                    backgroundColor: theme.palette.type === 'dark' ? 'rgba(30, 30, 35, 0.8)' : 'rgba(255,255,255,0.8)'
                                }
                            }}
                        >
                            <MenuItem onClick={() => { handleCloseMenu(); history.push("/profile"); }}>
                                {i18n.t("mainDrawer.appBar.user.profile")}
                            </MenuItem>
                            <MenuItem onClick={handleClickLogout}>
                                {i18n.t("mainDrawer.appBar.user.logout")}
                            </MenuItem>
                        </Menu>
                    </div>
                </Toolbar>
            </AppBar>

            <main className={clsx(classes.content, !drawerOpen && classes.contentShift)}>
                <motion.div
                    key={history.location.pathname}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                    style={{ height: '100%' }}
                >
                    {children}
                </motion.div>
            </main>
        </div>
    );
};

export default MainLayoutApple;
