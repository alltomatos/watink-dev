import { Router } from "express";
import isAuth from "../middleware/isAuth";

import * as PipelineController from "../controllers/PipelineController";

const pipelineRoutes = Router();

pipelineRoutes.get("/pipelines", isAuth, PipelineController.index);
pipelineRoutes.post("/pipelines", isAuth, PipelineController.store);
pipelineRoutes.put("/pipelines/:pipelineId", isAuth, PipelineController.update);
pipelineRoutes.delete("/pipelines/:pipelineId", isAuth, PipelineController.remove);

pipelineRoutes.post("/pipelines/ai-suggest", isAuth, PipelineController.aiSuggest);
pipelineRoutes.get("/pipelines/export/:pipelineId", isAuth, PipelineController.exportPipeline);
pipelineRoutes.post("/pipelines/import", isAuth, PipelineController.importPipeline);

export default pipelineRoutes;
