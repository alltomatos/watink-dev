declare module "@watink/plugin-sdk" {
  export interface PluginManifest {
    name: string;
    slug: string;
    backend?: { main?: string };
  }

  export interface IWatinkCore {
    [key: string]: any;
  }

  export class WatinkPlugin {
    setCore(core: IWatinkCore): void;
    onActivate?(): Promise<void> | void;
  }

  export class PluginBridge {
    static getInstance(): PluginBridge;
    setCore(core: IWatinkCore): void;
    getCore(): IWatinkCore;
  }
}
