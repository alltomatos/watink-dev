import { Sequelize } from "sequelize-typescript";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import ContactCustomField from "../models/ContactCustomField";
import Message from "../models/Message";
import Queue from "../models/Queue";
import WhatsappQueue from "../models/WhatsappQueue";
import UserQueue from "../models/UserQueue";
import QuickAnswer from "../models/QuickAnswer";
import Tenant from "../models/Tenant";
import Pipeline from "../models/Pipeline";
import PipelineStage from "../models/PipelineStage";
import Deal from "../models/Deal";
import Flow from "../models/Flow";
import FlowSession from "../models/FlowSession";
import FlowTrigger from "../models/FlowTrigger";

// eslint-disable-next-line
const dbConfig = require("../config/database");

const sequelize = new Sequelize(dbConfig);

const models = [
  User,
  Contact,
  Ticket,
  Message,
  Whatsapp,
  ContactCustomField,
  Setting,
  Queue,
  WhatsappQueue,
  UserQueue,
  QuickAnswer,
  Tenant,
  Pipeline,
  PipelineStage,
  Deal,
  Flow,
  FlowSession,
  FlowTrigger
];

sequelize.addModels(models);

export default sequelize;
