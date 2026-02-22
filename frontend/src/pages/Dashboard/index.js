/* @jsxImportSource react */
import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";
import Grid from "@material-ui/core/Grid";
import { Modal, Typography, Button, Checkbox, FormControlLabel, IconButton } from "@material-ui/core";
import SettingsIcon from "@material-ui/icons/Settings";
import { ArrowUpward, ArrowDownward } from "@material-ui/icons";

import { AuthContext } from "../../context/Auth/AuthContext";
import TicketsInfo from "../../components/Dashboard/Widgets/TicketsInfo";
import AttendanceChart from "../../components/Dashboard/Widgets/AttendanceChart";
import PerformanceMetrics from "../../components/Dashboard/Widgets/PerformanceMetrics";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
    backgroundColor: "#f5f6f8",
    minHeight: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(4),
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#1a1a1a",
  },
  customizeButton: {
    borderRadius: 20,
    textTransform: "none",
    fontWeight: 600,
    backgroundColor: "#ffffff",
    color: "#007AFF",
    border: "1px solid rgba(0,122,255,0.2)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    "&:hover": {
      backgroundColor: "#f0f7ff",
    }
  },
  modalPaper: {
    position: 'absolute',
    width: 450,
    backgroundColor: theme.palette.background.paper,
    border: 'none',
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
    padding: theme.spacing(4),
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: 20,
  },
  widgetConfigItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.03)",
  },
  saveButton: {
    borderRadius: 12,
    textTransform: "none",
    fontWeight: 600,
    padding: "12px",
    marginTop: theme.spacing(2),
  }
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
        { id: "performance_metrics", visible: true, width: 12, order: 1 },
        { id: "tickets_info", visible: true, width: 12, order: 2 },
        { id: "attendance_chart", visible: true, width: 12, order: 3 },
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

  const moveWidget = (index, direction) => {
    const newWidgets = [...widgets].sort((a, b) => a.order - b.order);
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= newWidgets.length) return;

    // Swap orders
    const tempOrder = newWidgets[index].order;
    newWidgets[index].order = newWidgets[targetIndex].order;
    newWidgets[targetIndex].order = tempOrder;

    setWidgets(newWidgets);
  };

  let userQueueIds = [];
  if (user?.queues && user.queues.length > 0) {
    userQueueIds = user.queues?.map((q) => q.id) || [];
  }

  const renderWidget = (widget) => {
    if (!widget.visible) return null;

    switch (widget.id) {
      case "performance_metrics":
        return <PerformanceMetrics key={widget.id} />;
      case "tickets_info":
        return <TicketsInfo key={widget.id} userQueueIds={userQueueIds} />;
      case "attendance_chart":
        return <AttendanceChart key={widget.id} />;
      default:
        return null;
    }
  };

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <div style={{ backgroundColor: "#f5f6f8", minHeight: "100vh" }}>
      <Container maxWidth="lg" className={classes.container}>
        <div className={classes.header}>
          <Typography className={classes.title}>Dashboard</Typography>
          <Button
            variant="contained"
            className={classes.customizeButton}
            startIcon={<SettingsIcon />}
            onClick={() => setModalOpen(true)}
          >
            Personalizar
          </Button>
        </div>

        <Grid container spacing={3}>
          {sortedWidgets.map(renderWidget)}
        </Grid>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        >
          <div className={classes.modalPaper}>
            <Typography variant="h5" style={{ fontWeight: 700, marginBottom: 24 }}>Configurações do Dashboard</Typography>
            {sortedWidgets.map((widget, index) => (
              <div key={widget.id} className={classes.widgetConfigItem}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={widget.visible}
                      onChange={() => toggleWidget(widget.id)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography style={{ fontWeight: 600 }}>
                      {widget.id === 'performance_metrics' ? 'Métricas de Performance (TMR/TME)' : 
                       widget.id === 'tickets_info' ? 'Resumo de Tickets' : 'Gráfico de Atendimentos'}
                    </Typography>
                  }
                />
                <div>
                  <IconButton
                    size="small"
                    onClick={() => moveWidget(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUpward />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => moveWidget(index, 1)}
                    disabled={index === sortedWidgets.length - 1}
                  >
                    <ArrowDownward />
                  </IconButton>
                </div>
              </div>
            ))}
            <Button
              variant="contained"
              color="primary"
              className={classes.saveButton}
              onClick={handleSaveConfigs}
              fullWidth
            >
              Salvar Preferências
            </Button>
          </div>
        </Modal>
      </Container>
    </div>
  );
};

export default Dashboard;
