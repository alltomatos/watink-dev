import { IWatinkCore } from "@watink/plugin-sdk";
import { logger } from "../../utils/logger";
import { Router } from "express";

class WatinkCore implements IWatinkCore {
    private events: Map<string, ((...args: any[]) => void)[]> = new Map();
    private router: Router;

    constructor(router: Router) {
        this.router = router;
    }

    public on(event: string, callback: (...args: any[]) => void): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)?.push(callback);
    }

    public emit(event: string, ...args: any[]): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(cb => {
                try {
                    cb(...args);
                } catch (err) {
                    logger.error(`Error in hook ${event}: ${err.message}`);
                }
            });
        }
    }

    public getQueryInterface(): any {
        // Return sequelize query interface
        return null; // TODO: Inject database
    }

    public addRoute(route: any): void {
        // Simplified route registration
        logger.info(`Plugin registered route: ${route.path}`);
        // this.router.use(route.path, route.handler);
    }

    public async getSetting(key: string): Promise<string> {
        return ""; // TODO: Implement
    }
}

export default WatinkCore;
