import { Sequelize } from "sequelize-typescript";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import ContactCustomField from "../models/ContactCustomField";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import TagGroup from "../models/TagGroup";
import Tag from "../models/Tag";
import EntityTag from "../models/EntityTag";
import Message from "../models/Message";
import Queue from "../models/Queue";
import WhatsappQueue from "../models/WhatsappQueue";
import UserQueue from "../models/UserQueue";
import UserGroup from "../models/UserGroup";
import QuickAnswer from "../models/QuickAnswer";
import Tenant from "../models/Tenant";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import Deal from "../models/Deal";
import Flow from "../models/Flow";
import FlowSession from "../models/FlowSession";
import FlowTrigger from "../models/FlowTrigger";
import KnowledgeBase from "../models/KnowledgeBase";
import KnowledgeSource from "../models/KnowledgeSource";
import KnowledgeVector from "../models/KnowledgeVector";
import Group from "../models/Group";
import Permission from "../models/Permission";
import Client from "../models/Client";
import ClientAddress from "../models/ClientAddress";
import ClientContact from "../models/ClientContact";
import ConversationEmbedding from "../models/ConversationEmbedding";
import Plugin from "../models/Plugin";
import PluginInstallation from "../models/PluginInstallation";
import TenantSmtpSettings from "../models/TenantSmtpSettings";
import Role from "../models/Role";
import RolePermission from "../models/RolePermission";
import UserRole from "../models/UserRole";
import GroupRole from "../models/GroupRole";
import GroupPermission from "../models/GroupPermission";
import Step from "../models/Step";
import EmailTemplate from "../models/EmailTemplate";
import ContactAudit from "../models/ContactAudit";
import WhatsAppGroup from "../models/WhatsAppGroup";
import WhatsAppGroupParticipant from "../models/WhatsAppGroupParticipant";


// eslint-disable-next-line
const dbConfig = require("../config/database");

const sequelize = new Sequelize(dbConfig);

const models = [
  User,
  Contact,
  ContactCustomField,
  Ticket,
  Message,
  Whatsapp,
  TagGroup,
  Tag,
  EntityTag,
  Setting,
  Queue,
  WhatsappQueue,
  UserQueue,
  UserGroup,
  QuickAnswer,
  Tenant,
  Pipeline,
  PipelineStage,
  Deal,
  Flow,
  FlowSession,
  FlowTrigger,
  KnowledgeBase,
  KnowledgeSource,
  KnowledgeVector,
  Group,
  Permission,
  Client,
  ClientAddress,
  ClientContact,
  ConversationEmbedding,
  TenantSmtpSettings,
  Plugin,
  PluginInstallation,
  Role,
  RolePermission,
  UserRole,
  GroupRole,
  GroupPermission,
  Step,
  EmailTemplate,
  ContactAudit,
  WhatsAppGroup,
  WhatsAppGroupParticipant,
];

sequelize.addModels(models);

import context from "../libs/context";

const setTenant = async (options: any, tenantId: any) => {
  if (!tenantId) return;
  
  // Optimization: Check if already set to avoid overhead
  const [res] = await sequelize.query("SELECT current_setting('app.current_tenant', true) as current", { 
    transaction: options.transaction,
    type: "SELECT" as any // Type assertion to avoid enum import issues
  }) as any;
  
  const currentTenant = res && res[0] ? res[0].current : null;

  if (currentTenant !== String(tenantId)) {
    // Fix SQL Injection: Use replacements
    await sequelize.query("SET app.current_tenant = :tenantId", {
      replacements: { tenantId },
      transaction: options.transaction
    });
  }
};

sequelize.addHook("beforeFind", async (options: any) => {
  const ctx = context.getStore();
  const tenantId = options.tenantId || ctx?.tenantId;
  await setTenant(options, tenantId);
});

sequelize.addHook("beforeCreate", async (instance: any, options: any) => {
  const ctx = context.getStore();
  const tenantId = instance.tenantId || ctx?.tenantId;
  await setTenant(options, tenantId);
});

sequelize.addHook("beforeUpdate", async (instance: any, options: any) => {
  const ctx = context.getStore();
  const tenantId = instance.tenantId || ctx?.tenantId;
  await setTenant(options, tenantId);
});

sequelize.addHook("beforeDestroy", async (instance: any, options: any) => {
  const ctx = context.getStore();
  const tenantId = instance.tenantId || ctx?.tenantId;
  await setTenant(options, tenantId);
});

export default sequelize;
