"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const User_1 = __importDefault(require("../models/User"));
const Setting_1 = __importDefault(require("../models/Setting"));
const Contact_1 = __importDefault(require("../models/Contact"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const ContactCustomField_1 = __importDefault(require("../models/ContactCustomField"));
const Message_1 = __importDefault(require("../models/Message"));
const Queue_1 = __importDefault(require("../models/Queue"));
const WhatsappQueue_1 = __importDefault(require("../models/WhatsappQueue"));
const UserQueue_1 = __importDefault(require("../models/UserQueue"));
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
const GroupPermission_1 = __importDefault(require("../models/GroupPermission"));
const Permission_1 = __importDefault(require("../models/Permission"));
const UserPermission_1 = __importDefault(require("../models/UserPermission"));
const Role_1 = __importDefault(require("../models/Role"));
const RolePermission_1 = __importDefault(require("../models/RolePermission"));
const UserRole_1 = __importDefault(require("../models/UserRole"));
const Client_1 = __importDefault(require("../models/Client"));
const ClientAddress_1 = __importDefault(require("../models/ClientAddress"));
const ClientContact_1 = __importDefault(require("../models/ClientContact"));
const Protocol_1 = __importDefault(require("../models/Protocol"));
const ProtocolHistory_1 = __importDefault(require("../models/ProtocolHistory"));
const ProtocolAttachment_1 = __importDefault(require("../models/ProtocolAttachment"));
const ConversationEmbedding_1 = __importDefault(require("../models/ConversationEmbedding"));
const TenantSubscription_1 = __importDefault(require("../models/TenantSubscription"));
const Plan_1 = __importDefault(require("../models/Plan"));
// eslint-disable-next-line
const dbConfig = require("../config/database");
const sequelize = new sequelize_typescript_1.Sequelize(dbConfig);
const models = [
    User_1.default,
    Contact_1.default,
    Ticket_1.default,
    Message_1.default,
    Whatsapp_1.default,
    ContactCustomField_1.default,
    Setting_1.default,
    Queue_1.default,
    WhatsappQueue_1.default,
    UserQueue_1.default,
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
    GroupPermission_1.default,
    Permission_1.default,
    UserPermission_1.default,
    Role_1.default,
    RolePermission_1.default,
    UserRole_1.default,
    Client_1.default,
    ClientAddress_1.default,
    ClientContact_1.default,
    Protocol_1.default,
    ProtocolHistory_1.default,
    ProtocolAttachment_1.default,
    ConversationEmbedding_1.default,
    TenantSubscription_1.default,
    Plan_1.default
];
sequelize.addModels(models);
exports.default = sequelize;
