"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const User_1 = __importDefault(require("../models/User"));
const Setting_1 = __importDefault(require("../models/Setting"));
const Contact_1 = __importDefault(require("../models/Contact"));
const ContactCustomField_1 = __importDefault(require("../models/ContactCustomField"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const TagGroup_1 = __importDefault(require("../models/TagGroup"));
const Tag_1 = __importDefault(require("../models/Tag"));
const EntityTag_1 = __importDefault(require("../models/EntityTag"));
const Message_1 = __importDefault(require("../models/Message"));
const Queue_1 = __importDefault(require("../models/Queue"));
const WhatsappQueue_1 = __importDefault(require("../models/WhatsappQueue"));
const UserQueue_1 = __importDefault(require("../models/UserQueue"));
const UserGroup_1 = __importDefault(require("../models/UserGroup"));
const QuickAnswer_1 = __importDefault(require("../models/QuickAnswer"));
const Tenant_1 = __importDefault(require("../models/Tenant"));
const Pipeline_1 = __importDefault(require("../models/Pipeline"));
const PipelineStage_1 = __importDefault(require("../models/PipelineStage"));
const Deal_1 = __importDefault(require("../models/Deal"));
const Flow_1 = __importDefault(require("../models/Flow"));
const FlowSession_1 = __importDefault(require("../models/FlowSession"));
const FlowTrigger_1 = __importDefault(require("../models/FlowTrigger"));
const KnowledgeBase_1 = __importDefault(require("../models/KnowledgeBase"));
const KnowledgeSource_1 = __importDefault(require("../models/KnowledgeSource"));
const KnowledgeVector_1 = __importDefault(require("../models/KnowledgeVector"));
const Group_1 = __importDefault(require("../models/Group"));
const Permission_1 = __importDefault(require("../models/Permission"));
const Client_1 = __importDefault(require("../models/Client"));
const ClientAddress_1 = __importDefault(require("../models/ClientAddress"));
const ClientContact_1 = __importDefault(require("../models/ClientContact"));
const Protocol_1 = __importDefault(require("../models/Protocol"));
const ProtocolHistory_1 = __importDefault(require("../models/ProtocolHistory"));
const ProtocolAttachment_1 = __importDefault(require("../models/ProtocolAttachment"));
const ConversationEmbedding_1 = __importDefault(require("../models/ConversationEmbedding"));
const Plugin_1 = __importDefault(require("../models/Plugin"));
const PluginInstallation_1 = __importDefault(require("../models/PluginInstallation"));
const TenantSmtpSettings_1 = __importDefault(require("../models/TenantSmtpSettings"));
const Role_1 = __importDefault(require("../models/Role"));
const RolePermission_1 = __importDefault(require("../models/RolePermission"));
const UserRole_1 = __importDefault(require("../models/UserRole"));
const GroupRole_1 = __importDefault(require("../models/GroupRole"));
const GroupPermission_1 = __importDefault(require("../models/GroupPermission"));
const Step_1 = __importDefault(require("../models/Step"));
const EmailTemplate_1 = __importDefault(require("../models/EmailTemplate"));
const ActivityTemplate_1 = __importDefault(require("../models/ActivityTemplate"));
const ActivityTemplateItem_1 = __importDefault(require("../models/ActivityTemplateItem"));
const Activity_1 = __importDefault(require("../models/Activity"));
const ActivityItem_1 = __importDefault(require("../models/ActivityItem"));
const ActivityMaterial_1 = __importDefault(require("../models/ActivityMaterial"));
// eslint-disable-next-line
const dbConfig = require("../config/database");
const sequelize = new sequelize_typescript_1.Sequelize(dbConfig);
const models = [
    User_1.default,
    Contact_1.default,
    ContactCustomField_1.default,
    Ticket_1.default,
    Message_1.default,
    Whatsapp_1.default,
    TagGroup_1.default,
    Tag_1.default,
    EntityTag_1.default,
    Setting_1.default,
    Queue_1.default,
    WhatsappQueue_1.default,
    UserQueue_1.default,
    UserGroup_1.default,
    QuickAnswer_1.default,
    Tenant_1.default,
    Pipeline_1.default,
    PipelineStage_1.default,
    Deal_1.default,
    Flow_1.default,
    FlowSession_1.default,
    FlowTrigger_1.default,
    KnowledgeBase_1.default,
    KnowledgeSource_1.default,
    KnowledgeVector_1.default,
    Group_1.default,
    Permission_1.default,
    Client_1.default,
    ClientAddress_1.default,
    ClientContact_1.default,
    Protocol_1.default,
    ProtocolHistory_1.default,
    ProtocolAttachment_1.default,
    ConversationEmbedding_1.default,
    TenantSmtpSettings_1.default,
    Plugin_1.default,
    PluginInstallation_1.default,
    Role_1.default,
    RolePermission_1.default,
    UserRole_1.default,
    GroupRole_1.default,
    GroupPermission_1.default,
    Step_1.default,
    EmailTemplate_1.default,
    ActivityTemplate_1.default,
    ActivityTemplateItem_1.default,
    Activity_1.default,
    ActivityItem_1.default,
    ActivityMaterial_1.default
];
sequelize.addModels(models);
sequelize.addHook("beforeFind", (options) => __awaiter(void 0, void 0, void 0, function* () {
    if (options.tenantId && options.transaction) {
        yield sequelize.query(`SET app.current_tenant = '${options.tenantId}'`, {
            transaction: options.transaction
        });
    }
}));
sequelize.addHook("beforeCreate", (instance, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (instance.tenantId && options.transaction) {
        yield sequelize.query(`SET app.current_tenant = '${instance.tenantId}'`, {
            transaction: options.transaction
        });
    }
}));
sequelize.addHook("beforeUpdate", (instance, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (instance.tenantId && options.transaction) {
        yield sequelize.query(`SET app.current_tenant = '${instance.tenantId}'`, {
            transaction: options.transaction
        });
    }
}));
sequelize.addHook("beforeDestroy", (instance, options) => __awaiter(void 0, void 0, void 0, function* () {
    if (instance.tenantId && options.transaction) {
        yield sequelize.query(`SET app.current_tenant = '${instance.tenantId}'`, {
            transaction: options.transaction
        });
    }
}));
exports.default = sequelize;
