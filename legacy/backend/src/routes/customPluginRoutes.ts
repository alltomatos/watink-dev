import { Router } from "express";
import isAuth from "../middleware/isAuth";
import PluginLoader from "../services/PluginServices/PluginLoader";

const customPluginRoutes = Router();

customPluginRoutes.get("/custom-plugins/manifests", isAuth, (req, res) => {
    const plugins = PluginLoader.getInstance().getPlugins();
    const manifests = plugins.map(p => p.manifest);
    res.json(manifests);
});

export default customPluginRoutes;
