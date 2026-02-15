"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const CreateQueueService_1 = __importDefault(require("../services/QueueService/CreateQueueService"));
const DeleteQueueService_1 = __importDefault(require("../services/QueueService/DeleteQueueService"));
const ListQueuesService_1 = __importDefault(require("../services/QueueService/ListQueuesService"));
const ShowQueueService_1 = __importDefault(require("../services/QueueService/ShowQueueService"));
const UpdateQueueService_1 = __importDefault(require("../services/QueueService/UpdateQueueService"));
const index = async (req, res) => {
    const queues = await (0, ListQueuesService_1.default)();
    return res.status(200).json(queues);
};
exports.index = index;
const store = async (req, res) => {
    const { name, color, greetingMessage } = req.body;
    const queue = await (0, CreateQueueService_1.default)({ name, color, greetingMessage });
    const io = (0, socket_1.getIO)();
    io.emit("queue", {
        action: "update",
        queue
    });
    return res.status(200).json(queue);
};
exports.store = store;
const show = async (req, res) => {
    const { queueId } = req.params;
    const queue = await (0, ShowQueueService_1.default)(queueId);
    return res.status(200).json(queue);
};
exports.show = show;
const update = async (req, res) => {
    const { queueId } = req.params;
    const queue = await (0, UpdateQueueService_1.default)(queueId, req.body);
    const io = (0, socket_1.getIO)();
    io.emit("queue", {
        action: "update",
        queue
    });
    return res.status(201).json(queue);
};
exports.update = update;
const remove = async (req, res) => {
    const { queueId } = req.params;
    await (0, DeleteQueueService_1.default)(queueId);
    const io = (0, socket_1.getIO)();
    io.emit("queue", {
        action: "delete",
        queueId: +queueId
    });
    return res.status(200).send();
};
exports.remove = remove;
