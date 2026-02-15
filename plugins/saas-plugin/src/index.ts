import { WatinkPlugin, PluginManifest } from "@watink/plugin-sdk";

export default class SaaSPlugin extends WatinkPlugin {
  manifest: PluginManifest = {
    slug: "saas-plugin",
    name: "SaaS Add-on",
    version: "1.0.0",
    description: "Habilita operação multi-tenant com franquia por tenant e gestão de planos.",
    type: "premium",
    category: "saas",
    backend: {
      permissions: [
        { name: "view_tenants", description: "Visualizar gestão de tenants" },
        { name: "edit_tenants", description: "Editar planos de tenants" }
      ],
      hooks: ["tenant_created", "subscription_updated"]
    },
    frontend: {
      menuItems: [
        {
          name: "Gestão SaaS",
          icon: "Business",
          path: "/saas-manager",
          permission: "view_tenants"
        }
      ],
      routes: [
        {
          path: "/saas-manager",
          component: "SaaSAdmin"
        }
      ]
    }
  };

  async onInstall(): Promise<void> {
    console.log("SaaS Plugin Installed");
  }

  async onActivate(): Promise<void> {
    console.log("SaaS Plugin Activated");
    // Aqui registraríamos os hooks no Core
    this.core.on("tenant_created", async (tenant: any) => {
        console.log(`New tenant created: ${tenant.name}. Applying default plan.`);
        // Lógica de plano default
    });
  }

  async onDeactivate(): Promise<void> {
    console.log("SaaS Plugin Deactivated");
  }

  async onUninstall(): Promise<void> {
    console.log("SaaS Plugin Uninstalled");
  }
}
