import React from "react";
import { Paper, Typography, Grid, makeStyles } from "@material-ui/core";
import { i18n } from "../../../translate/i18n";
import useTickets from "../../../hooks/useTickets";

const useStyles = makeStyles((theme) => ({
  customFixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 120,
  },
}));

const TicketsInfo = ({ userQueueIds }) => {
  const classes = useStyles();

  const GetTickets = (status, showAll, withUnreadMessages) => {
    const { count } = useTickets({
      status: status,
      showAll: showAll,
      withUnreadMessages: withUnreadMessages,
      queueIds: JSON.stringify(userQueueIds),
    });
    return count;
  };

  return (
    <React.Fragment>
      <Grid item xs={4}>
        <Paper className={classes.customFixedHeightPaper} style={{ overflow: "hidden" }}>
          <Typography component="h3" variant="h6" color="primary" paragraph>
            {i18n.t("dashboard.messages.inAttendance.title")}
          </Typography>
          <Grid item>
            <Typography component="h1" variant="h4">
              {GetTickets("open", "true", "false")}
            </Typography>
          </Grid>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper className={classes.customFixedHeightPaper} style={{ overflow: "hidden" }}>
          <Typography component="h3" variant="h6" color="primary" paragraph>
            {i18n.t("dashboard.messages.waiting.title")}
          </Typography>
          <Grid item>
            <Typography component="h1" variant="h4">
              {GetTickets("pending", "true", "false")}
            </Typography>
          </Grid>
        </Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper className={classes.customFixedHeightPaper} style={{ overflow: "hidden" }}>
          <Typography component="h3" variant="h6" color="primary" paragraph>
            {i18n.t("dashboard.messages.closed.title")}
          </Typography>
          <Grid item>
            <Typography component="h1" variant="h4">
              {GetTickets("closed", "true", "false")}
            </Typography>
          </Grid>
        </Paper>
      </Grid>
    </React.Fragment>
  );
};

export default TicketsInfo;
