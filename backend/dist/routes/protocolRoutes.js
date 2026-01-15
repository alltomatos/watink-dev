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
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const upload_1 = __importDefault(require("../config/upload"));
const ProtocolController = __importStar(require("../controllers/ProtocolController"));
const ProtocolPublicController = __importStar(require("../controllers/ProtocolPublicController"));
const ProtocolKanbanController = __importStar(require("../controllers/ProtocolKanbanController"));
const ProtocolAttachmentController = __importStar(require("../controllers/ProtocolAttachmentController"));
const protocolRoutes = express_1.default.Router();
const upload = (0, multer_1.default)(upload_1.default);
protocolRoutes.get("/protocols/kanban", isAuth_1.default, ProtocolKanbanController.index);
protocolRoutes.get("/protocols/dashboard", isAuth_1.default, ProtocolController.dashboard);
protocolRoutes.get("/protocols", isAuth_1.default, ProtocolController.index);
protocolRoutes.post("/protocols", isAuth_1.default, ProtocolController.store);
protocolRoutes.get("/protocols/:protocolId", isAuth_1.default, ProtocolController.show);
protocolRoutes.put("/protocols/:protocolId", isAuth_1.default, upload.array("files", 10), ProtocolController.update);
// Attachment routes
protocolRoutes.get("/protocols/:protocolId/attachments", isAuth_1.default, ProtocolAttachmentController.index);
protocolRoutes.post("/protocols/:protocolId/attachments", isAuth_1.default, upload.array("files", 10), ProtocolAttachmentController.store);
protocolRoutes.delete("/protocols/:protocolId/attachments/:attachmentId", isAuth_1.default, ProtocolAttachmentController.destroy);
// Public route for protocol checking
protocolRoutes.get("/public/protocols/:token", ProtocolPublicController.show);
protocolRoutes.get("/public/protocols/:token/attachments", ProtocolAttachmentController.publicIndex);
// Special route for creating protocol from contact drawer
protocolRoutes.post("/contacts/:contactId/protocols", isAuth_1.default, ProtocolController.createFromContact);
exports.default = protocolRoutes;
