import React, { useState, useContext, useEffect, useCallback } from "react";
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
import PageTransition from "../components/PageTransition";
import NotificationsPopOver from "../components/NotificationsPopOver";
import UserModal from "../components/UserModal";
import VersionFooter from "../components/VersionFooter";
import BackdropLoading from "../components/BackdropLoading";
import { AuthContext } from "../context/Auth/AuthContext";
import { useThemeContext } from "../context/DarkMode";
import { i18n } from "../translate/i18n";
import api from "../services/api";
import { getBackendUrl } from "../helpers/urlUtils";

// ── Layout constants ──
const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_CLOSED = 72;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100vh",
    backgroundColor: "var(--bg-default)",
  },
  // ── Drawer ──
  drawerPaper: {
    position: "relative",
    whiteSpace: "nowrap",
    width: DRAWER_WIDTH,
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    display: "flex",
    flexDirection: "column",
    backgroundColor: "var(--bg-sidebar, var(--bg-surface))",
    borderRight: "1px solid var(--border-sidebar, var(--border-subtle))",
    color: "var(--text-sidebar, var(--text-primary))",
    boxShadow: "var(--shadow-sidebar-glow, none)",
  },
  drawerPaperClose: {
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: DRAWER_WIDTH_CLOSED,
  },
  // ── AppBar ──
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    backgroundColor: "var(--bg-appbar, var(--bg-surface))",
    backdropFilter: "var(--appbar-blur, none)",
    boxShadow: "var(--shadow-appbar, none)",
    borderBottom: "1px solid var(--border-appbar, var(--border-subtle))",
    color: "var(--text-appbar, var(--text-primary))",
  },
  appBarShift: {
    marginLeft: DRAWER_WIDTH,
    width: `calc(100% - ${DRAWER_WIDTH}px)`,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  appBarCollapsed: {
    marginLeft: DRAWER_WIDTH_CLOSED,
    width: `calc(100% - ${DRAWER_WIDTH_CLOSED}px)`,
  },
  toolbar: {
    paddingRight: 24,
    display: "flex",
    justifyContent: "space-between",
  },
  menuButton: {
    marginRight: 20,
  },
  // ── Content ──
  content: {
    flexGrow: 1,
    height: "100vh",
    overflow: "auto",
    backgroundColor: "var(--bg-content, var(--bg-default))",
  },
  appBarSpacer: {
    minHeight: 64,
  },
  // ── Logo ──
  logoContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: 80,
    padding: "16px",
    borderBottom: "1px solid var(--border-logo-divider, var(--border-subtle))",
  },
  logoText: {
    fontWeight: 700,
    fontSize: "1.2rem",
    color: "var(--text-primary)",
  },
  systemLogo: {
    maxWidth: "80%",
    maxHeight: 60,
    objectFit: "contain",
  },
  // ── User area ──
  userActions: {
    display: "flex",
    alignItems: "center",
  },
}));

const MainLayout = ({ children }) => {
  const classes = useStyles();
  useThemeContext(); 
  const { user, handleLogout, loading } = useContext(AuthContext);

  const [anchorEl, setAnchorEl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(window.innerWidth > 600);
  const [drawerVariant, setDrawerVariant] = useState(
    window.innerWidth < 600 ? "temporary" : "permanent"
  );
  const [userModalOpen, setUserModalOpen] = useState(false);

  const [systemLogo, setSystemLogo] = useState("");
  const [systemTitle, setSystemTitle] = useState("Watink");
  const [logoEnabled, setLogoEnabled] = useState(true);
  const [frontendVersion, setFrontendVersion] = useState("-");

  // ── Responsive drawer variant ──
  useEffect(() => {
    const handleResize = () => {
      setDrawerVariant(window.innerWidth < 600 ? "temporary" : "permanent");
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Fetch system settings (logo, title, favicon) ──
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/settings");
        const settings = Array.isArray(data) ? data : [];
        const logo = settings.find((s) => s.key === "systemLogo");
        const title = settings.find((s) => s.key === "systemTitle");
        const enabled = settings.find((s) => s.key === "systemLogoEnabled");
        const favicon = settings.find((s) => s.key === "systemFavicon");

        if (logo?.value) setSystemLogo(logo.value);
        if (title?.value) {
          setSystemTitle(title.value);
          document.title = title.value;
        }
        if (enabled) setLogoEnabled(enabled.value === "true");
        if (favicon?.value) {
          let link = document.querySelector("link[rel~='icon']");
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = getBackendUrl(favicon.value);
        }
      } catch (err) {
        // Silent settings fetch
      }
    };
    fetchSettings();
  }, []);

  // ── Frontend version ──
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setFrontendVersion(data?.version || data?.frontendVersion || "-");
        }
      } catch (_err) {
        // version.json unavailable
      }
    };
    loadVersion();
  }, []);

  // ── Handlers ──
  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);
  const drawerClose = useCallback(() => {
    if (window.innerWidth < 600) setDrawerOpen(false);
  }, []);

  const handleMenu = useCallback((event) => {
    setAnchorEl(event.currentTarget);
    setMenuOpen(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setAnchorEl(null);
    setMenuOpen(false);
  }, []);

  const handleOpenUserModal = useCallback(() => {
    setUserModalOpen(true);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleClickLogout = useCallback(() => {
    handleCloseMenu();
    handleLogout();
  }, [handleCloseMenu, handleLogout]);

  if (loading) return <BackdropLoading />;

  return (
    <div className={classes.root}>
      {/* ── Sidebar ── */}
      <Drawer
        variant={drawerVariant}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        className={clsx(!drawerOpen && classes.drawerPaperClose)}
        classes={{
          paper: clsx(classes.drawerPaper, !drawerOpen && classes.drawerPaperClose),
        }}
      >
        <Box className={classes.logoContainer}>
          {drawerOpen && systemLogo && logoEnabled ? (
            <img src={getBackendUrl(systemLogo)} alt="Logo" className={classes.systemLogo} />
          ) : drawerOpen && systemTitle ? (
            <Typography className={classes.logoText} noWrap>
              {systemTitle}
            </Typography>
          ) : null}
        </Box>
        <Divider />
        <List style={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
          <MainListItems drawerClose={drawerClose} collapsed={!drawerOpen} />
        </List>
        <Divider />
        <VersionFooter collapsed={!drawerOpen} />
      </Drawer>

      {/* ── User Modal ── */}
      <UserModal open={userModalOpen} onClose={() => setUserModalOpen(false)} userId={user?.id} />

      {/* ── Top bar ── */}
      <AppBar
        position="absolute"
        className={clsx(classes.appBar, drawerOpen ? classes.appBarShift : classes.appBarCollapsed)}
      >
        <Toolbar className={classes.toolbar}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="toggle drawer"
              onClick={toggleDrawer}
              className={classes.menuButton}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap>
              {systemTitle}
            </Typography>
          </div>

          <div className={classes.userActions}>
            <Tooltip title={`Frontend v${frontendVersion}`} arrow>
              <IconButton
                size="small"
                aria-label="frontend-version"
                style={{ color: "var(--action-primary)" }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {user?.id && <NotificationsPopOver />}

            <IconButton
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              {user?.profileImage ? (
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
              id="menu-appbar"
              anchorEl={anchorEl}
              getContentAnchorEl={null}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              open={menuOpen}
              onClose={handleCloseMenu}
            >
              <MenuItem onClick={handleOpenUserModal}>
                {i18n.t("mainDrawer.appBar.user.profile")}
              </MenuItem>
              <MenuItem onClick={handleClickLogout}>
                {i18n.t("mainDrawer.appBar.user.logout")}
              </MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      {/* ── Main content ── */}
      <main className={classes.content}>
          <div className={classes.appBarSpacer} />
          <PageTransition>{children}</PageTransition>
        </main>
    </div>
  );
};

export default MainLayout;