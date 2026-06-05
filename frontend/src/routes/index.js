/* @jsxImportSource react */
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes as RouterRoutes } from "react-router-dom";
import { ToastContainer } from "react-toastify";

import LoggedInLayout from "../layout";
import PageLoader from "../components/PageLoader";

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
 <Suspense fallback={<PageLoader />}>
     <RouterRoutes>
     <Route path="/" element={<Dashboard />} isPrivate />
     <Route path="/pipelines" element={<Pipelines />} isPrivate />
     <Route path="/pipelines/new" element={<PipelineCreator />} isPrivate />
     <Route path="/pipelines/:pipelineId/edit" element={<PipelineCreator />} isPrivate />
     <Route path="/pipelines/:pipelineId" element={<PipelineBoard />} isPrivate />
     <Route path="/tickets/:ticketId?" element={<Tickets />} isPrivate />
     <Route path="/flowbuilder" element={<FlowManager />} isPrivate />
     <Route path="/flowbuilder/:flowId" element={<FlowBuilder />} isPrivate />
     <Route path="/connections" element={<Connections />} isPrivate />
     <Route path="/connections/:whatsappId" element={<ConnectionConfig />} isPrivate />
     <Route path="/contacts" element={<Contacts />} isPrivate />
     <Route path="/users" element={<Users />} isPrivate />
     <Route path="/users/:userId" element={<UserEdit />} isPrivate />
     <Route path="/profile" element={<UserProfile />} isPrivate />
     <Route path="/reset-password" element={<ResetPassword />} isPrivate />
     <Route path="/my-activities" element={<MyActivities />} isPrivate />
     <Route path="/access" element={<Access />} isPrivate />
     <Route path="/groups/:groupId" element={<GroupEdit />} isPrivate />
     <Route path="/quickAnswers" element={<QuickAnswers />} isPrivate />
     <Route path="/Settings" element={<Settings />} isPrivate />
     <Route path="/groups" element={<Groups />} isPrivate />
     <Route path="/tags" element={<TagManager />} isPrivate />
     <Route path="/roles" element={<Roles />} isPrivate />
     <Route path="/roles/:roleId" element={<RoleEdit />} isPrivate />
     <Route path="/queues" element={<Queues />} isPrivate />
     <Route path="/knowledge-bases" element={<KnowledgeBase />} isPrivate />
     <Route path="/knowledge-bases/:knowledgeBaseId" element={<KnowledgeBaseConfig />} isPrivate />
     <Route path="/swagger" element={<Swagger />} isPrivate />
     <Route path="/admin/settings/marketplace" element={<Marketplace />} isPrivate />
     <Route path="/admin/settings/billing" element={<Billing />} isPrivate />
     <Route path="/admin/settings/marketplace/:slug" element={<PluginDetail />} isPrivate />
     <Route path="/clients" element={<Clients />} isPrivate />
     <Route path="/helpdesk" element={<Helpdesk />} isPrivate />
     <Route path="/helpdesk/kanban" element={<HelpdeskKanban />} isPrivate />
     <Route path="/helpdesk/tv" element={<HelpdeskTvMode />} isPrivate />
     <Route path="/helpdesk/:protocolId" element={<ProtocolDetails />} isPrivate />
     <Route path="/saas-manager" element={<SaaSAdmin />} isPrivate />
     <Route path="/monitor" element={<VersionDashboard />} isPrivate />
     <Route path="/monitor/queues" element={<MonitorQueues />} isPrivate />
     <Route path="/versions" element={<VersionDashboard />} isPrivate />
     </RouterRoutes>
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
 <Suspense fallback={<PageLoader />}>
     <RouterRoutes>
     <Route path="/initial-setup" element={<InitialSetup />} />
     <Route path="/login" element={<Login />} />
     <Route path="/signup" element={<Signup />} />
     <Route path="/public/protocols/:token" element={<PublicProtocol />} isPublic />
     <Route path="/*" element={<PrivateRoutes />} isPrivate />
     </RouterRoutes>
 </Suspense>
 <ToastContainer autoClose={3000} />
 </ThemeProvider>
 </AuthProvider>
 </StatusCheck>
 </BrowserRouter>
 );
};

export default Routes;
