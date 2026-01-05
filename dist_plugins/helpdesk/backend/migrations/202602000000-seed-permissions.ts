
import { QueryInterface } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const permissions = [
    {
        "name": "view_helpdesk",
        "description": "Visualizar Helpdesk"
    },
    {
        "name": "edit_helpdesk",
        "description": "Editar Helpdesk"
    },
    {
        "name": "view_protocols",
        "description": "Visualizar Protocolos"
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
            name: ["view_helpdesk","edit_helpdesk","view_protocols"]
        }, {});
    }
};
