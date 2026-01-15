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
const checkPermission_1 = __importDefault(require("../middleware/checkPermission"));
const KnowledgeController = __importStar(require("../controllers/KnowledgeController"));
const upload_1 = __importDefault(require("../config/upload"));
const upload = (0, multer_1.default)(upload_1.default);
const knowledgeRoutes = express_1.default.Router();
// ... (Swagger docs omitted)
knowledgeRoutes.get("/knowledge-bases", isAuth_1.default, (0, checkPermission_1.default)("view_knowledge_bases"), KnowledgeController.index);
knowledgeRoutes.get("/knowledge-bases/:knowledgeBaseId", isAuth_1.default, (0, checkPermission_1.default)("view_knowledge_bases"), KnowledgeController.show);
knowledgeRoutes.post("/knowledge-bases", isAuth_1.default, (0, checkPermission_1.default)("manage_knowledge_bases"), KnowledgeController.store);
knowledgeRoutes.put("/knowledge-bases/:knowledgeBaseId", isAuth_1.default, (0, checkPermission_1.default)("manage_knowledge_bases"), KnowledgeController.update);
knowledgeRoutes.delete("/knowledge-bases/:knowledgeBaseId", isAuth_1.default, (0, checkPermission_1.default)("manage_knowledge_bases"), KnowledgeController.remove);
knowledgeRoutes.get("/knowledge-bases/:knowledgeBaseId/sources", isAuth_1.default, (0, checkPermission_1.default)("view_knowledge_bases"), KnowledgeController.listSources);
knowledgeRoutes.post("/knowledge-bases/:knowledgeBaseId/sources", isAuth_1.default, (0, checkPermission_1.default)("manage_knowledge_bases"), upload.single("file"), KnowledgeController.createSource);
knowledgeRoutes.delete("/knowledge-bases/sources/:sourceId", isAuth_1.default, (0, checkPermission_1.default)("manage_knowledge_bases"), KnowledgeController.removeSource);
knowledgeRoutes.post("/knowledge-bases/sources/:sourceId/retry", isAuth_1.default, (0, checkPermission_1.default)("manage_knowledge_bases"), KnowledgeController.retrySource);
exports.default = knowledgeRoutes;
