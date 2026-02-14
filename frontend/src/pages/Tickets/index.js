import React, { useContext } from "react";
import { useParams } from "react-router-dom";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import clsx from "clsx";

import TicketsManager from "../../components/TicketsManager/";
import Ticket from "../../components/Ticket/";

import { i18n } from "../../translate/i18n";
import Hidden from "@material-ui/core/Hidden";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useThemeContext } from "../../context/DarkMode";

const useStyles = makeStyles((theme) => ({
  chatContainer: {
    flex: 1,
    height: `calc(100% - 48px)`,
    overflowY: "hidden",
    backgroundColor: theme.palette.background.default,
  },
  chatContainerApple: {
    height: "100%",
    backgroundColor: "transparent",
  },

  chatPapper: {
    display: "flex",
    height: "100%",
    backgroundColor: theme.palette.background.paper,
  },
  chatPapperApple: {
    backgroundColor: "transparent",
    gap: "20px",
  },

  contactsWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
  },
  contactsWrapperApple: {
    backgroundColor: theme.palette.type === 'dark' ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(20px)",
    borderRadius: 20,
    boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
  },
  contactsWrapperSmall: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflowY: "hidden",
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  messagessWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
  },
  messagessWrapperApple: {
    backgroundColor: theme.palette.type === 'dark' ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.6)",
    backdropFilter: "blur(20px)",
    borderRadius: 20,
    boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  welcomeMsg: {
    backgroundColor: theme.palette.background.paper,
    display: "flex",
    justifyContent: "space-evenly",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
    borderRadius: 0,
  },
  welcomeMsgApple: {
    backgroundColor: "transparent",
    color: theme.palette.text.secondary,
    fontSize: "1.1rem",
    fontWeight: 500,
  },
  ticketsManager: {},
  ticketsManagerClosed: {
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  noQueueWarning: {
    padding: theme.spacing(2),
    backgroundColor: "#fff3cd",
    color: "#856404",
    borderBottom: "1px solid #ffeeba",
    textAlign: "center",
    fontWeight: "bold"
  }
}));

const Chat = () => {
  const classes = useStyles();
  const { ticketId } = useParams();
  const { user } = useContext(AuthContext);
  const { appTheme } = useThemeContext();

  const showNoQueueWarning =
    user &&
    user.profile !== "admin" &&
    (!user.queues || user.queues.length === 0);

  return (
    <div className={clsx(classes.chatContainer, appTheme === "apple" && classes.chatContainerApple)}>
      <div className={clsx(classes.chatPapper, appTheme === "apple" && classes.chatPapperApple)}>
        <Grid container spacing={appTheme === "apple" ? 0 : 0} style={{ height: '100%' }}>
          <Grid
            item
            xs={12}
            md={4}
            className={clsx(
              ticketId ? classes.contactsWrapperSmall : classes.contactsWrapper,
              appTheme === "apple" && classes.contactsWrapperApple
            )}
          >
            {showNoQueueWarning && (
              <Paper className={classes.noQueueWarning} square>
                {i18n.t("Você não possui filas atribuídas. Contate o administrador.")}
              </Paper>
            )}
            <TicketsManager />
          </Grid>
          <Grid item xs={12} md={8} className={clsx(classes.messagessWrapper, appTheme === "apple" && classes.messagessWrapperApple)}>
            {ticketId ? (
              <>
                <Ticket />
              </>
            ) : (
              <Hidden only={["sm", "xs"]}>
                <Paper className={clsx(classes.welcomeMsg, appTheme === "apple" && classes.welcomeMsgApple)} elevation={0}>
                  <span>{i18n.t("chat.noTicketMessage")}</span>
                </Paper>
              </Hidden>
            )}
          </Grid>
        </Grid>
      </div>
    </div>
  );
};

export default Chat;
