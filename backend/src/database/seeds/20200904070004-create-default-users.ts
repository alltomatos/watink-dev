import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.bulkInsert(
      "Users",
      [
        {
          name: "Administrador",
          email: "admin@superwhaticket.com",
          passwordHash:
            "$2a$08$PnmooWKbYHsPFpuPZqewAeKVPSdLXzw9tRr29nXvvFx/21UQ/J6Ge",
          profile: "admin",
          tokenVersion: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      {}
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Users", {});
  }
};
