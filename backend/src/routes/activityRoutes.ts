import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import checkPermission from "../middleware/checkPermission";
import uploadConfig from "../config/upload";
import * as ActivityTemplateController from "../controllers/ActivityTemplateController";
import * as ActivityController from "../controllers/ActivityController";

const activityRoutes = express.Router();
const upload = multer(uploadConfig);

// ==========================================
// Activity Templates (Configuração)
// ==========================================
activityRoutes.get(
    "/activity-templates",
    isAuth,
    checkPermission("activity-template:read"),
    ActivityTemplateController.index
);

activityRoutes.get(
    "/activity-templates/:id",
    isAuth,
    checkPermission("activity-template:read"),
    ActivityTemplateController.show
);

activityRoutes.post(
    "/activity-templates",
    isAuth,
    checkPermission("activity-template:write"),
    ActivityTemplateController.store
);

activityRoutes.put(
    "/activity-templates/:id",
    isAuth,
    checkPermission("activity-template:write"),
    ActivityTemplateController.update
);

activityRoutes.delete(
    "/activity-templates/:id",
    isAuth,
    checkPermission("activity-template:delete"),
    ActivityTemplateController.remove
);

// ==========================================
// Activities (Execução)
// ==========================================
activityRoutes.get(
    "/activities",
    isAuth,
    checkPermission("activity:read"),
    ActivityController.index
);

activityRoutes.get(
    "/my-activities",
    isAuth,
    ActivityController.myActivities
);

activityRoutes.get(
    "/activities/:id",
    isAuth,
    checkPermission("activity:read"),
    ActivityController.show
);

activityRoutes.post(
    "/activities",
    isAuth,
    checkPermission("activity:write"),
    ActivityController.store
);

activityRoutes.put(
    "/activities/:id",
    isAuth,
    checkPermission("activity:write"),
    ActivityController.update
);

activityRoutes.delete(
    "/activities/:id",
    isAuth,
    checkPermission("activity:delete"),
    ActivityController.remove
);

// ==========================================
// Activity Items (Checklist)
// ==========================================
activityRoutes.put(
    "/activities/:activityId/items/:itemId",
    isAuth,
    checkPermission("activity:write"),
    ActivityController.updateItem
);

// Upload de foto para item do tipo 'photo'
activityRoutes.post(
    "/activities/:activityId/items/:itemId/photo",
    isAuth,
    upload.single("photo"),
    checkPermission("activity:write"),
    ActivityController.uploadItemPhoto
);

// ==========================================
// Activity Materials
// ==========================================
activityRoutes.post(
    "/activities/:id/materials",
    isAuth,
    checkPermission("activity:write"),
    ActivityController.addMaterial
);

// ==========================================
// Activity Finalization
// ==========================================
activityRoutes.post(
    "/activities/:id/finalize",
    isAuth,
    checkPermission("activity:finalize"),
    ActivityController.finalize
);

// ==========================================
// PDF Generation (RAT)
// ==========================================
activityRoutes.get(
    "/activities/:id/pdf",
    isAuth,
    checkPermission("activity:read"),
    ActivityController.generatePdf
);

export default activityRoutes;
