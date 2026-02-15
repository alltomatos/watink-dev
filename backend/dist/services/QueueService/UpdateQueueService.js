"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const ShowQueueService_1 = __importDefault(require("./ShowQueueService"));
const UpdateQueueService = async (queueId, queueData) => {
    const { color, name } = queueData;
    const queueSchema = Yup.object().shape({
        name: Yup.string()
            .min(2, "ERR_QUEUE_INVALID_NAME")
            .test("Check-unique-name", "ERR_QUEUE_NAME_ALREADY_EXISTS", async (value) => {
            if (value) {
                const queueWithSameName = await Queue_1.default.findOne({
                    where: { name: value, id: { [sequelize_1.Op.not]: queueId } }
                });
                return !queueWithSameName;
            }
            return true;
        }),
        color: Yup.string()
            .required("ERR_QUEUE_INVALID_COLOR")
            .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async (value) => {
            if (value) {
                const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
                return colorTestRegex.test(value);
            }
            return true;
        })
            .test("Check-color-exists", "ERR_QUEUE_COLOR_ALREADY_EXISTS", async (value) => {
            if (value) {
                const queueWithSameColor = await Queue_1.default.findOne({
                    where: { color: value, id: { [sequelize_1.Op.not]: queueId } }
                });
                return !queueWithSameColor;
            }
            return true;
        })
    });
    try {
        await queueSchema.validate({ color, name });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const queue = await (0, ShowQueueService_1.default)(queueId);
    await queue.update(queueData);
    return queue;
};
exports.default = UpdateQueueService;
