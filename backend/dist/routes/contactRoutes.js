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
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const checkPermission_1 = __importDefault(require("../middleware/checkPermission"));
const ContactController = __importStar(require("../controllers/ContactController"));
const ImportPhoneContactsController = __importStar(require("../controllers/ImportPhoneContactsController"));
const contactRoutes = express_1.default.Router();
// ... (Swagger docs omitted for brevity, keeping only route logic updates)
contactRoutes.post("/contacts/import", isAuth_1.default, (0, checkPermission_1.default)("create_contacts"), ImportPhoneContactsController.store);
contactRoutes.get("/contacts", isAuth_1.default, ContactController.index);
contactRoutes.get("/contacts/:contactId", isAuth_1.default, ContactController.show);
contactRoutes.post("/contacts", isAuth_1.default, (0, checkPermission_1.default)("create_contacts"), ContactController.store);
contactRoutes.post("/contact", isAuth_1.default, ContactController.getContact);
contactRoutes.put("/contacts/:contactId", isAuth_1.default, (0, checkPermission_1.default)("edit_contacts"), ContactController.update);
contactRoutes.delete("/contacts/:contactId", isAuth_1.default, (0, checkPermission_1.default)("delete_contacts"), ContactController.remove);
contactRoutes.post("/contacts/:contactId/sync", isAuth_1.default, (0, checkPermission_1.default)("edit_contacts"), ContactController.sync);
contactRoutes.post("/contacts/enrich", isAuth_1.default, (0, checkPermission_1.default)("create_contacts"), 
// 'create_contacts' or 'edit_contacts' - enrichment feels like cleanup/maintenance.
// Using 'create_contacts' as it can essentially "create" new data for contacts.
ContactController.batchEnrich);
exports.default = contactRoutes;
