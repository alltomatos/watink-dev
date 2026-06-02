/* @jsxImportSource react */
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Switch } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";

const Dashboard = lazy(() => import("../pages/Dashboard/"));
const Pipelines = lazy(() => import("../pages/Pipelines/"));
const PipelineCreator = lazy(() => import("../pages/Pipelines/PipelineCreator"));
const PipelineBoard = lazy(() => import("../pages/Pipelines/PipelineBoard"));
const Tickets = lazy(() => import("../pages/Tickets/"));
const FlowBuilder = lazy(() => import("../pages/FlowBuilder/"));
const FlowManager = lazy(() => import("../pages/FlowManager/"));
const Signup = lazy(() => import("../pages/Signup/"));
const Login = lazy(() => import("../pages/Login/"));
const Connections = lazy(() => import("../pages/Connections/"));
const ConnectionConfig = lazy(() => import("../pages/Connections/ConnectionConfig"));
const Settings = lazy(() => import("../pages/Settings/"));
const Users = lazy(() => import("../pages/Users"));
const UserEdit = lazy(() => import("../pages/UserEdit"));
const UserProfile = lazy(() => import("../pages/UserProfile"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const MyActivities = lazy(() => import("../pages/MyActivities"));
const GroupEdit = lazy(() => import("../pages/GroupEdit"));
const Contacts = lazy(() => import("../pages/Contacts/"));
const QuickAnswers = lazy(() => import("../pages/QuickAnswers/"));
const Access = lazy(() => import("../pages/Access"));
const Groups = lazy(() => import("../pages/Groups"));
const TagManager = lazy(() => import("../pages/TagManager/"));
const Roles = lazy(() => import("../pages/Roles"));
const RoleEdit = lazy(() => import("../pages/RoleEdit"));
const Queues = lazy(() => import("../pages/Queues/"));
const KnowledgeBase = lazy(() => import("../pages/KnowledgeBase/"));
const KnowledgeBaseConfig = lazy(() => import("../pages/KnowledgeBase/KnowledgeBaseConfig"));
const Marketplace = lazy(() => import("../pages/Marketplace/"));
const Billing = lazy(() => import("../pages/Billing/"));
const PluginDetail = lazy(() => import("../pages/Marketplace/PluginDetail"));
const Clients = lazy(() => import("../pages/Clients/"));
const Helpdesk = lazy(() => import("../pages/Helpdesk/"));
const ProtocolDetails = lazy(() => import("../pages/Helpdesk/ProtocolDetails"));
const HelpdeskKanban = lazy(() => import("../pages/Helpdesk/HelpdeskKanban"));
const HelpdeskTvMode = lazy(() => import("../pages/Helpdesk/HelpdeskTvMode"));
const Swagger = lazy(() => import("../pages/Swagger/"));
const VersionDashboard = lazy(() => import("../pages/VersionDashboard/"));
const MonitorQueues = lazy(() => import("../pages/MonitorQueues/"));
const SaaSAdmin = lazy(() => import("../pages/SaaS/"));
const InitialSetup = lazy(() => import("../pages/InitialSetup/"));
const PublicProtocol = lazy(() => import("../pages/PublicProtocol"));
import { AuthProvider } from "../context/Auth/AuthContext";
import { WhatsAppsProvider } from "../context/WhatsApp/WhatsAppsContext";
import { ThemeProvider } from "../context/DarkMode";
import { TicketsProvider } from "../context/Tickets/TicketsContext";
import Route from "./Route";
import StatusCheck from "../components/StatusCheck";

const PrivateRoutes = () => {
 return (
 <WhatsAppsProvider>
 <TicketsProvider>
 <LoggedInLayout>
 <Suspense fallback={<div />}>
 <Switch>
            <Route exact path="/" component={Dashboard} isPrivate />
            <Route exact path="/pipelines" component={Pipelines} isPrivate />
            <Route exact path="/pipelines/new" component={PipelineCreator} isPrivate />
            <Route exact path="/pipelines/:pipelineId/edit" component={PipelineCreator} isPrivate />
            <Route exact path="/pipelines/:pipelineId" component={PipelineBoard} isPrivate />
            <Route exact path="/tickets/:ticketId?" component={Tickets} isPrivate />
            <Route exact path="/flowbuilder" component={FlowManager} isPrivate />
            <Route exact path="/flowbuilder/:flowId" component={FlowBuilder} isPrivate />
            <Route exact path="/connections" component={Connections} isPrivate />
            <Route exact path="/connections/:whatsappId" component={ConnectionConfig} isPrivate />
            <Route exact path="/contacts" component={Contacts} isPrivate />
            <Route exact path="/users" component={Users} isPrivate />
            <Route exact path="/users/:userId" component={UserEdit} isPrivate />
            <Route exact path="/profile" component={UserProfile} isPrivate />
            <Route exact path="/reset-password" component={ResetPassword} isPrivate />
            <Route exact path="/my-activities" component={MyActivities} isPrivate />
            <Route exact path="/access" component={Access} isPrivate />
            <Route exact path="/groups/:groupId" component={GroupEdit} isPrivate />
            <Route exact path="/quickAnswers" component={QuickAnswers} isPrivate />
            <Route exact path="/Settings" component={Settings} isPrivate />
            <Route exact path="/groups" component={Groups} isPrivate />
            <Route exact path="/tags" component={TagManager} isPrivate />
            <Route exact path="/roles" component={Roles} isPrivate />
            <Route exact path="/roles/:roleId" component={RoleEdit} isPrivate />
            <Route exact path="/queues" component={Queues} isPrivate />
            <Route exact path="/knowledge-bases" component={KnowledgeBase} isPrivate />
            <Route exact path="/knowledge-bases/:knowledgeBaseId" component={KnowledgeBaseConfig} isPrivate />
            <Route exact path="/swagger" component={Swagger} isPrivate />
            <Route exact path="/admin/settings/marketplace" component={Marketplace} isPrivate />
            <Route exact path="/admin/settings/billing" component={Billing} isPrivate />
            <Route exact path="/admin/settings/marketplace/:slug" component={PluginDetail} isPrivate />
            <Route exact path="/clients" component={Clients} isPrivate />
            <Route exact path="/helpdesk" component={Helpdesk} isPrivate />
            <Route exact path="/helpdesk/kanban" component={HelpdeskKanban} isPrivate />
            <Route exact path="/helpdesk/tv" component={HelpdeskTvMode} isPrivate />
            <Route exact path="/helpdesk/:protocolId" component={ProtocolDetails} isPrivate />
            <Route exact path="/saas-manager" component={SaaSAdmin} isPrivate />
            <Route exact path="/monitor" component={VersionDashboard} isPrivate />
            <Route exact path="/monitor/queues" component={MonitorQueues} isPrivate />
            <Route exact path="/versions" component={VersionDashboard} isPrivate />
          </Switch>
          </Suspense>
          </LoggedInLayout>
      </TicketsProvider>
    </WhatsAppsProvider>
  );
};

const Routes = () => {
 return (
 <BrowserRouter>
 <StatusCheck>
 <AuthProvider>
 <ThemeProvider>
 <Suspense fallback={<div />}>
 <Switch>
 <Route exact path="/initial-setup" component={InitialSetup} />
 <Route exact path="/login" component={Login} />
 <Route exact path="/signup" component={Signup} />
 <Route exact path="/public/protocols/:token" component={PublicProtocol} isPublic />
 <Route path="/" component={PrivateRoutes} isPrivate />
 </Switch>
 </Suspense>
 <ToastContainer autoClose={3000} />
 </ThemeProvider>
 </AuthProvider>
 </StatusCheck>
 </BrowserRouter>
 );
};

export default Routes;
