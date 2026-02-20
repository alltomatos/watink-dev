/* @jsxImportSource react */
import React from "react";
import { useParams } from "react-router-dom";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";

import TicketsManager from "../../components/TicketsManager/";
import Ticket from "../../components/Ticket/";

import { i18n } from "../../translate/i18n";
import Hidden from "@material-ui/core/Hidden";

const useStyles = makeStyles((theme) => ({
  chatContainer: {
    flex: 1,
    height: "100%",
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },

  chatPapper: {
    display: "flex",
    height: "100%",
    backgroundColor: "#ffffff",
  },

  contactsWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderRight: "1px solid rgba(0,0,0,0.05)",
  },
  contactsWrapperSmall: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
    borderRight: "1px solid rgba(0,0,0,0.05)",
  },
  messagessWrapper: {
    display: "flex",
    height: "100%",
    flexDirection: "column",
    backgroundColor: "#f5f6f8",
  },
  welcomeMsg: {
    backgroundColor: "#f5f6f8",
    display: "flex",
    justifyContent: "space-evenly",
    alignItems: "center",
    height: "100%",
    textAlign: "center",
    borderRadius: 0,
  },
}));

const Chat = () => {
  const classes = useStyles();
  const { ticketId } = useParams();

  return (
    <div className={classes.chatContainer}>
      <div className={classes.chatPapper}>
        <Grid container spacing={0} style={{height: '100%'}}>
          <Grid
            item
            xs={12}
            md={4}
            lg={3}
            className={
              ticketId ? classes.contactsWrapperSmall : classes.contactsWrapper
            }
          >
            <TicketsManager />
          </Grid>
          <Grid item xs={12} md={8} lg={9} className={classes.messagessWrapper}>
            {ticketId ? (
              <>
                <Ticket />
              </>
            ) : (
              <Hidden only={["sm", "xs"]}>
                <Paper className={classes.welcomeMsg} elevation={0}>
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
