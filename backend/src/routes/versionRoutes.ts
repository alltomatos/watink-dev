import { Router } from "express";
import packageJson from "../../package.json";

const versionRoutes = Router();

versionRoutes.get("/", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
        version: packageJson.version,
        engineVersion: process.env.ENGINE_VERSION || "1.0.0",
    });
});

export default versionRoutes;
