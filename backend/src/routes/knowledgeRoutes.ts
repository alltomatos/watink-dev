import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import * as KnowledgeController from "../controllers/KnowledgeController";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

const knowledgeRoutes = express.Router();

// Knowledge Bases
knowledgeRoutes.get("/knowledge-bases", isAuth, KnowledgeController.index);
knowledgeRoutes.get("/knowledge-bases/:knowledgeBaseId", isAuth, KnowledgeController.show);
knowledgeRoutes.post("/knowledge-bases", isAuth, KnowledgeController.store);
knowledgeRoutes.put("/knowledge-bases/:knowledgeBaseId", isAuth, KnowledgeController.update);
knowledgeRoutes.delete("/knowledge-bases/:knowledgeBaseId", isAuth, KnowledgeController.remove);

// Sources
knowledgeRoutes.get("/knowledge-bases/:knowledgeBaseId/sources", isAuth, KnowledgeController.listSources);
knowledgeRoutes.post("/knowledge-bases/:knowledgeBaseId/sources", isAuth, upload.single("file"), KnowledgeController.createSource);
knowledgeRoutes.delete("/knowledge-bases/sources/:sourceId", isAuth, KnowledgeController.removeSource);
knowledgeRoutes.post("/knowledge-bases/sources/:sourceId/retry", isAuth, KnowledgeController.retrySource);

export default knowledgeRoutes;
