
import { QueryInterface } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const permissions = [
    {
        "name": "view_clients",
        "description": "Visualizar Clientes"
    },
    {
        "name": "edit_clients",
        "description": "Editar Clientes"
    },
    {
        "name": "delete_clients",
        "description": "Deletar Clientes"
    }
];
        // Add dates manually since JSON.stringify makes them strings
        const permissionsWithDates = permissions.map(p => ({
            ...p,
            createdAt: new Date(),
            updatedAt: new Date()
        }));
        return queryInterface.bulkInsert("Permissions", permissionsWithDates, { ignoreDuplicates: true } as any);
    },
    down: async (queryInterface: QueryInterface) => {
        return queryInterface.bulkDelete("Permissions", {
            name: ["view_clients","edit_clients","delete_clients"]
        }, {});
    }
};
