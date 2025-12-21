import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import { Modal, Typography, Button, Checkbox, FormControlLabel } from "@material-ui/core";
import SettingsIcon from "@material-ui/icons/Settings";

import { AuthContext } from "../../context/Auth/AuthContext";
import TicketsInfo from "../../components/Dashboard/Widgets/TicketsInfo";
import AttendanceChart from "../../components/Dashboard/Widgets/AttendanceChart";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  modalPaper: {
    position: 'absolute',
    width: 400,
    backgroundColor: theme.palette.background.paper,
    border: '2px solid #000',
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
}));

const Dashboard = () => {
  const classes = useStyles();
  const { user, setUser } = useContext(AuthContext);
  const [widgets, setWidgets] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user.configs && user.configs.dashboard && user.configs.dashboard.widgets) {
      setWidgets(user.configs.dashboard.widgets);
    } else {
      setWidgets([
        { id: "tickets_info", visible: true, width: 12, order: 1 },
        { id: "attendance_chart", visible: true, width: 12, order: 2 },
      ]);
    }
  }, [user]);

  const handleSaveConfigs = async () => {
    try {
      const newConfigs = {
        ...user.configs,
        dashboard: {
          widgets: widgets,
        },
      };
      
      await api.put(`/users/${user.id}/configs`, { configs: newConfigs });
      
      // Update local user context
      setUser({ ...user, configs: newConfigs });
      
      toast.success("Dashboard preferences saved!");
      setModalOpen(false);
    } catch (err) {
      toast.error("Error saving preferences");
    }
  };

  const toggleWidget = (id) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, visible: !w.visible } : w
    ));
  };

  let userQueueIds = [];
  if (user.queues && user.queues.length > 0) {
    userQueueIds = user.queues.map((q) => q.id);
  }

  const renderWidget = (widget) => {
    if (!widget.visible) return null;

    switch (widget.id) {
      case "tickets_info":
        return <TicketsInfo key={widget.id} userQueueIds={userQueueIds} />;
      case "attendance_chart":
        return <AttendanceChart key={widget.id} />;
      default:
        return null;
    }
  };

  return (
    <div>
      <Container maxWidth="lg" className={classes.container}>
        <Grid container spacing={3} style={{ marginBottom: 20 }}>
          <Grid item xs={12} style={{ display: 'flex', justifyContent: 'flex-end' }}>
             <Button 
                variant="outlined" 
                color="primary" 
                startIcon={<SettingsIcon />}
                onClick={() => setModalOpen(true)}
              >
                Customize Dashboard
              </Button>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {widgets.sort((a, b) => a.order - b.order).map(renderWidget)}
        </Grid>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        >
          <div className={classes.modalPaper}>
            <Typography variant="h6" gutterBottom>Customize Dashboard</Typography>
            {widgets.map(widget => (
              <div key={widget.id}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={widget.visible}
                      onChange={() => toggleWidget(widget.id)}
                      color="primary"
                    />
                  }
                  label={widget.id === 'tickets_info' ? 'Tickets Info' : 'Attendance Chart'}
                />
              </div>
            ))}
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSaveConfigs}
              style={{ marginTop: 20 }}
            >
              Save
            </Button>
          </div>
        </Modal>
      </Container>
    </div>
  );
};

export default Dashboard;
