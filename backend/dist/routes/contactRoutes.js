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
const ContactController = __importStar(require("../controllers/ContactController"));
const ImportPhoneContactsController = __importStar(require("../controllers/ImportPhoneContactsController"));
const contactRoutes = express_1.default.Router();
// Multer config for CSV file upload (memory storage for buffer processing)
const csvUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Accept CSV and text files
        if (file.mimetype === "text/csv" ||
            file.mimetype === "application/csv" ||
            file.mimetype === "text/plain" ||
            file.originalname.endsWith(".csv")) {
            cb(null, true);
        }
        else {
            cb(new Error("Only CSV files are allowed"));
        }
    }
});
// Phone contacts import (legacy)
contactRoutes.post("/contacts/import", isAuth_1.default, (0, checkPermission_1.default)("contacts:write"), ImportPhoneContactsController.store);
// CSV import - new endpoint
contactRoutes.post("/contacts/import-csv", isAuth_1.default, (0, checkPermission_1.default)("contacts:write"), csvUpload.single("file"), ContactController.importCsv);
// CSV sample download
contactRoutes.get("/contacts/import-csv/sample", isAuth_1.default, (0, checkPermission_1.default)("contacts:write"), ContactController.getSampleCsv);
contactRoutes.get("/contacts", isAuth_1.default, (0, checkPermission_1.default)("contacts:read"), ContactController.index);
contactRoutes.get("/contacts/:contactId", isAuth_1.default, (0, checkPermission_1.default)("contacts:read"), ContactController.show);
contactRoutes.post("/contacts", isAuth_1.default, (0, checkPermission_1.default)("contacts:write"), ContactController.store);
contactRoutes.post("/contact", isAuth_1.default, (0, checkPermission_1.default)("contacts:read"), ContactController.getContact);
contactRoutes.put("/contacts/:contactId", isAuth_1.default, (0, checkPermission_1.default)("contacts:write"), ContactController.update);
contactRoutes.delete("/contacts/:contactId", isAuth_1.default, (0, checkPermission_1.default)("contacts:delete"), ContactController.remove);
contactRoutes.post("/contacts/:contactId/sync", isAuth_1.default, (0, checkPermission_1.default)("contacts:write"), ContactController.sync);
contactRoutes.post("/contacts/enrich", isAuth_1.default, (0, checkPermission_1.default)("contacts:write"), ContactController.batchEnrich);
exports.default = contactRoutes;
