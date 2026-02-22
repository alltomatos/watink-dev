/* @jsxImportSource react */
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
    IconButton,
    Menu,
    Box,
    Avatar,
    Tooltip,
} from "@material-ui/core";
import MenuIcon from "@material-ui/icons/Menu";
import AccountCircle from "@material-ui/icons/AccountCircle";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";

import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import UserModal from "../components/UserModal";
import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { i18n } from "../translate/i18n";
import VersionFooter from "../components/VersionFooter";
import api from "../services/api";
import { getBackendUrl } from "../helpers/urlUtils";
import { useThemeContext } from "../context/DarkMode";

const drawerWidth = 240;

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        height: "100vh",
        backgroundColor: "#f5f6f8",
    },
    toolbar: {
        paddingRight: 24, 
        backgroundColor: "#ffffff",
        color: "#333",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
    },
    appBar: {
        zIndex: theme.zIndex.drawer + 1,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        backgroundColor: "#ffffff",
        boxShadow: "none",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
    },
    appBarShift: {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(["width", "margin"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    },
    menuButton: {
        marginRight: 16,
    },
    title: {
        flexGrow: 0,
        fontWeight: 700,
        marginRight: 24,
    },
    drawerPaper: {
        position: "relative",
        whiteSpace: "nowrap",
        width: drawerWidth,
        transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        borderRight: "1px solid rgba(0,0,0,0.05)",
    },
    drawerPaperClose: {
        overflowX: "hidden",
        transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        width: 72,
        display: "flex",
        flexDirection: "column",
    },
    appBarSpacer: {
        minHeight: "64px",
    },
    content: {
        flex: 1,
        overflow: "hidden",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
    },
    logoContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        minHeight: 80,
    },
    systemLogo: {
        maxWidth: "80%",
        maxHeight: 50,
        objectFit: "contain",
    },
}));

const MainLayoutDefault = ({ children }) => {
    const classes = useStyles();
    const history = useHistory();
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const { handleLogout, loading } = useContext(AuthContext);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerVariant, setDrawerVariant] = useState("permanent");
    const { user } = useContext(AuthContext);
    const { appTheme } = useThemeContext();
    const [systemLogo, setSystemLogo] = useState("");
    const [systemTitle, setSystemTitle] = useState("Watink");
    const [frontendVersion, setFrontendVersion] = useState("-");

    useEffect(() => {
        if (document.body.offsetWidth > 600) {
            setDrawerOpen(false); // Start collapsed for modern look
        }
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await api.get("/settings");
                const settingsData = Array.isArray(data) ? data : [];
                const logoSetting = settingsData.find(s => s.key === "systemLogo");
                const titleSetting = settingsData.find(s => s.key === "systemTitle");
                if (logoSetting?.value) setSystemLogo(logoSetting.value);
                if (titleSetting?.value) {
                    setSystemTitle(titleSetting.value);
                    document.title = titleSetting.value;
                }
            } catch (err) {}
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        setDrawerVariant(document.body.offsetWidth < 600 ? "temporary" : "permanent");
    }, [drawerOpen]);

    useEffect(() => {
        const loadFrontendVersion = async () => {
            try {
                const res = await fetch("/version.json", { cache: "no-store" });
                if (!res.ok) return;
                const data = await res.json();
                const version = data?.version || data?.frontendVersion;
                if (version) setFrontendVersion(version);
            } catch (err) {}
        };

        loadFrontendVersion();
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

    if (loading) {
        return <BackdropLoading />;
    }

    return (
        <div className={classes.root}>
            <Drawer
                variant={drawerVariant}
                className={drawerOpen ? classes.drawerPaper : classes.drawerPaperClose}
                classes={{
                    paper: clsx(
                        classes.drawerPaper,
                        !drawerOpen && classes.drawerPaperClose
                    ),
                }}
                open={drawerOpen}
            >
                <Box className={classes.logoContainer}>
                    {systemLogo ? (
                        <img
                            src={getBackendUrl(systemLogo)}
                            alt="Logo"
                            className={classes.systemLogo}
                        />
                    ) : (
                        <Typography variant="h6" style={{fontWeight:800}}>{systemTitle}</Typography>
                    )}
                </Box>
                <List style={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
                    <MainListItems drawerClose={drawerClose} collapsed={!drawerOpen} />
                </List>
                <Divider />
                <VersionFooter collapsed={!drawerOpen} />
            </Drawer>
            
            <AppBar
                position="absolute"
                className={clsx(classes.appBar, drawerOpen && classes.appBarShift)}
            >
                <Toolbar variant="regular" className={classes.toolbar}>
                    <IconButton
                        edge="start"
                        onClick={() => setDrawerOpen(!drawerOpen)}
                        className={classes.menuButton}
                    >
                        <MenuIcon />
                    </IconButton>
                    
                    <Typography
                        variant="h6"
                        noWrap
                        className={classes.title}
                    >
                        {(() => {
                            const t = i18n.t("mainDrawer.appBar.user.tickets");
                            return t && t !== "mainDrawer.appBar.user.tickets" ? t : "Tickets";
                        })()}
                    </Typography>

                    {/* Integrated dynamic header content can be injected via context or portal if needed, 
                        but for now we'll keep the AppBar generic and the TicketsManager specific. */}
                    
                    <div style={{ flexGrow: 1 }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Tooltip title={`Frontend v${frontendVersion}`} arrow>
                            <IconButton
                                size="small"
                                aria-label="frontend-version"
                                style={{ color: "#007AFF" }}
                            >
                                <InfoOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>

                        {user.id && <NotificationsPopOver />}

                        <IconButton
                            onClick={handleMenu}
                            color="inherit"
                        >
                            {user.profileImage ? (
                                <Avatar
                                    alt={user.name}
                                    src={getBackendUrl(user.profileImage)}
                                    style={{ width: 32, height: 32 }}
                                />
                            ) : (
                                <AccountCircle />
                            )}
                        </IconButton>
                        <Menu
                            anchorEl={anchorEl}
                            getContentAnchorEl={null}
                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                            open={menuOpen}
                            onClose={handleCloseMenu}
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
            <main className={classes.content}>
                <div className={classes.appBarSpacer} />
                {children}
            </main>
        </div>
    );
};

export default MainLayoutDefault;
