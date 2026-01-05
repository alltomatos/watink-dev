import { Router } from "express";
import axios from "axios";

const engineRoutes = Router();

/**
 * @openapi
 * /engine/version:
 *   get:
 *     summary: Retorna a versão do serviço Whaileys Engine
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Versão do Engine
 */
engineRoutes.get("/engine/version", async (req, res) => {
  try {
    const { data } = await axios.get("http://whaileys-engine:3334/version", {
      headers: { "Cache-Control": "no-store" },
      timeout: 1500,
    });
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: "Engine Unavailable" });
  }
});

export default engineRoutes;
