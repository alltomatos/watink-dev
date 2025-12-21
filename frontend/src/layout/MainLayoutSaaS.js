import React, { useState, useContext, useEffect } from "react";
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
    Hidden,
} from "@material-ui/core";
import AccountCircle from "@material-ui/icons/AccountCircle";
import MenuIcon from "@material-ui/icons/Menu";

import MainListItems from "./MainListItems";
import NotificationsPopOver from "../components/NotificationsPopOver";
import UserModal from "../components/UserModal";
import { AuthContext } from "../context/Auth/AuthContext";
import BackdropLoading from "../components/BackdropLoading";
import { i18n } from "../translate/i18n";
import VersionFooter from "../components/VersionFooter";

const drawerWidth = 260; // Slightly wider for SaaS look

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        height: "100vh",
        backgroundColor: theme.palette.background.default,
    },
    sidebar: {
        width: drawerWidth,
        flexShrink: 0,
        borderRight: "1px solid rgba(0,0,0,0.08)",
    },
    sidebarPaper: {
        width: drawerWidth,
        borderRight: "none",
        backgroundColor: theme.palette.background.paper,
    },
    appBar: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        boxShadow: "none",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        color: theme.palette.text.primary,
        [theme.breakpoints.down("sm")]: {
            width: "100%",
            marginLeft: 0,
        }
    },
    toolbar: {
        paddingRight: 24,
        display: "flex",
        justifyContent: "space-between",
    },
    content: {
        flexGrow: 1,
        height: "100vh",
        overflow: "auto",
        paddingTop: 64, // AppBar height
    },
    logoContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 64,
        borderBottom: "1px solid rgba(0,0,0,0.05)",
    },
    logoText: {
        fontWeight: 700,
        fontSize: "1.2rem",
        color: theme.palette.primary.main,
    },
    menuButton: {
        marginRight: 20,
        [theme.breakpoints.up("md")]: {
            display: "none",
        },
    },
    userActions: {
        display: "flex",
        alignItems: "center",
    }
}));

const MainLayoutSaaS = ({ children }) => {
    const classes = useStyles();
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const { handleLogout, loading, user } = useContext(AuthContext);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
        setMenuOpen(true);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setMenuOpen(false);
    };

    const handleOpenUserModal = () => {
        setUserModalOpen(true);
        handleCloseMenu();
    };

    const handleClickLogout = () => {
        handleCloseMenu();
        handleLogout();
    };

    if (loading) {
        return <BackdropLoading />;
    }

    const drawerContent = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className={classes.logoContainer}>
                <Typography variant="h6" noWrap className={classes.logoText}>
                    WhaTicket SaaS
                </Typography>
            </div>
            <List style={{ flexGrow: 1 }}>
                <MainListItems drawerClose={() => setMobileOpen(false)} />
            </List>
            <VersionFooter />
        </div>
    );

    return (
        <div className={classes.root}>
            {/* Mobile Drawer */}
            <Hidden smUp implementation="css">
                <Drawer
                    variant="temporary"
                    anchor="left"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    classes={{
                        paper: classes.sidebarPaper,
                    }}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                >
                    {drawerContent}
                </Drawer>
            </Hidden>

            {/* Desktop Sidebar (Permanent) */}
            <Hidden xsDown implementation="css">
                <Drawer
                    classes={{
                        paper: classes.sidebarPaper,
                    }}
                    variant="permanent"
                    open
                    className={classes.sidebar}
                >
                    <div className={classes.sidebarPaper} style={{ height: '100%' }}>
                        {drawerContent}
                    </div>
                </Drawer>
            </Hidden>

            <AppBar position="fixed" className={classes.appBar}>
                <Toolbar className={classes.toolbar}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            className={classes.menuButton}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" noWrap>
                            Dashboard
                        </Typography>
                    </div>

                    <div className={classes.userActions}>
                        {user.id && <NotificationsPopOver />}

                        <IconButton
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleMenu}
                            color="inherit"
                        >
                            <AccountCircle />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorEl}
                            getContentAnchorEl={null}
                            anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                            }}
                            transformOrigin={{
                                vertical: "top",
                                horizontal: "right",
                            }}
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

            <UserModal
                open={userModalOpen}
                onClose={() => setUserModalOpen(false)}
                userId={user?.id}
            />

            <main className={classes.content}>
                {children}
            </main>
        </div>
    );
};

export default MainLayoutSaaS;
