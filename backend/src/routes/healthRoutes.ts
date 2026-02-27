import { Router, Request, Response } from "express";

const healthRoutes = Router();

healthRoutes.get("/health", (req: Request, res: Response) => {
  return res.status(200).json({ status: "UP", timestamp: new Date().toISOString() });
});

export default healthRoutes;
