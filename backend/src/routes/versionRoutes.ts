import { Router } from "express";
import packageJson from "../../package.json";

const versionRoutes = Router();

versionRoutes.get("/", (req, res) => {
    res.status(200).json({
        version: packageJson.version,
    });
});

export default versionRoutes;
