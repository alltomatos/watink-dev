export interface IWatinkCore {
    // Hooks
    on(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;

    // Database
    getQueryInterface(): any;
    
    // Express
    addRoute(route: any): void;
    
    // Settings
    getSetting(key: string): Promise<string>;
}

export class PluginBridge {
    private static instance: PluginBridge;
    private core?: IWatinkCore;

    private constructor() {}

    public static getInstance(): PluginBridge {
        if (!PluginBridge.instance) {
            PluginBridge.instance = new PluginBridge();
        }
        return PluginBridge.instance;
    }

    public setCore(core: IWatinkCore) {
        this.core = core;
    }

    public getCore(): IWatinkCore {
        if (!this.core) {
            throw new Error("PluginBridge: Core not initialized");
        }
        return this.core;
    }
}
