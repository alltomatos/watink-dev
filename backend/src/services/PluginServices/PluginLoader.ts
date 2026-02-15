import fs from "fs";
import path from "path";
import { PluginManifest, WatinkPlugin, PluginBridge, IWatinkCore } from "@watink/plugin-sdk";
import { logger } from "../../utils/logger";
import { Router } from "express";

interface LoadedPlugin {
    manifest: PluginManifest;
    instance?: WatinkPlugin;
}

class PluginLoader {
    private static instance: PluginLoader;
    private plugins: Map<string, LoadedPlugin> = new Map();
    private pluginsPath = path.resolve(__dirname, "..", "..", "..", "..", "plugins");
    private router: Router = Router();

    private constructor() {}

    public static getInstance(): PluginLoader {
        if (!PluginLoader.instance) {
            PluginLoader.instance = new PluginLoader();
        }
        return PluginLoader.instance;
    }

    public getRouter(): Router {
        return this.router;
    }

    public async init(core: IWatinkCore) {
        logger.info("Initializing Plugin Loader...");
        
        PluginBridge.getInstance().setCore(core);

        if (!fs.existsSync(this.pluginsPath)) {
            logger.warn(`Plugins directory not found: ${this.pluginsPath}`);
            return;
        }

        const pluginDirs = fs.readdirSync(this.pluginsPath);

        for (const dir of pluginDirs) {
            const pluginDir = path.join(this.pluginsPath, dir);
            if (fs.statSync(pluginDir).isDirectory()) {
                await this.loadPlugin(pluginDir);
            }
        }
    }

    private async loadPlugin(pluginDir: string) {
        const manifestPath = path.join(pluginDir, "plugin.json");
        
        if (!fs.existsSync(manifestPath)) {
            return;
        }

        try {
            const manifest: PluginManifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
            logger.info(`Loading plugin: ${manifest.name} (${manifest.slug})`);

            let instance: WatinkPlugin | undefined;

            // Load backend entry point if defined
            if (manifest.backend && manifest.backend.main) {
                const mainPath = path.resolve(pluginDir, manifest.backend.main);
                
                if (fs.existsSync(mainPath) || fs.existsSync(mainPath + ".js") || fs.existsSync(mainPath + ".ts")) {
                    try {
                        // Dynamically import the plugin class
                        // Note: Using require for compatibility with current setup
                        const PluginClass = require(mainPath).default;
                        if (PluginClass) {
                            instance = new PluginClass();
                            instance?.setCore(PluginBridge.getInstance().getCore());
                            await instance?.onActivate();
                        }
                    } catch (importErr) {
                        logger.error(`Error activating plugin ${manifest.slug}: ${importErr.message}`);
                    }
                }
            }

            this.plugins.set(manifest.slug, { manifest, instance });
        } catch (err) {
            logger.error(`Failed to load plugin at ${pluginDir}: ${err.message}`);
        }
    }

    public getPlugins(): LoadedPlugin[] {
        return Array.from(this.plugins.values());
    }

    public getPlugin(slug: string): LoadedPlugin | undefined {
        return this.plugins.get(slug);
    }
}

export default PluginLoader;
