import React from "react";
import { BrowserRouter, Switch } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import Dashboard from "../pages/Dashboard/";
import Pipelines from "../pages/Pipelines/";
import PipelineWizard from "../pages/Pipelines/PipelineWizard";
import PipelineCreator from "../pages/Pipelines/PipelineCreator";
import PipelineBoard from "../pages/Pipelines/PipelineBoard";
import Tickets from "../pages/Tickets/";
import Signup from "../pages/Signup/";
import Login from "../pages/Login/";
import Connections from "../pages/Connections/";
import ConnectionConfig from "../pages/Connections/ConnectionConfig";
import Settings from "../pages/Settings/";
import Users from "../pages/Users";
import Contacts from "../pages/Contacts/";
import QuickAnswers from "../pages/QuickAnswers/";
import Queues from "../pages/Queues/";
import Swagger from "../pages/Swagger/";
import { AuthProvider } from "../context/Auth/AuthContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import { ThemeProvider } from "../context/DarkMode";
import Route from "./Route";

const PrivateRoutes = () => {
  return (
    <WhatsAppsProvider>
      <LoggedInLayout>
        <Switch>
          <Route exact path="/" component={Dashboard} isPrivate />
          <Route exact path="/pipelines" component={Pipelines} isPrivate />
          <Route exact path="/pipelines/new" component={PipelineCreator} isPrivate />
          <Route exact path="/pipelines/:pipelineId" component={PipelineBoard} isPrivate />
          <Route exact path="/tickets/:ticketId?" component={Tickets} isPrivate />
          <Route exact path="/connections" component={Connections} isPrivate />
          <Route exact path="/connections/:whatsappId" component={ConnectionConfig} isPrivate />
          <Route exact path="/contacts" component={Contacts} isPrivate />
          <Route exact path="/users" component={Users} isPrivate />
          <Route exact path="/quickAnswers" component={QuickAnswers} isPrivate />
          <Route exact path="/Settings" component={Settings} isPrivate />
          <Route exact path="/Queues" component={Queues} isPrivate />
          <Route exact path="/swagger" component={Swagger} isPrivate />
        </Switch>
      </LoggedInLayout>
    </WhatsAppsProvider>
  );
};

const Routes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <Switch>
            <Route exact path="/login" component={Login} />
            <Route exact path="/signup" component={Signup} />
            <Route path="/" component={PrivateRoutes} isPrivate />
          </Switch>
          <ToastContainer autoClose={3000} />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default Routes;
