import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.bulkInsert("Plugins", [
      {
        id: "550e8400-e29b-41d4-a716-446655440004",
        slug: "saas-plugin",
        name: "SaaS Add-on",
        description: "Habilita operação multi-tenant com franquia por tenant e gestão de planos.",
        version: "1.0.0",
        type: "premium",
        price: 199.90,
        iconUrl: "https://plugins.watink.com/saas/icon.png",
        category: "saas",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Plugins", { slug: "saas-plugin" });
  }
};
