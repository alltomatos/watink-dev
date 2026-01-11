
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist_plugins');
const frontendSrc = path.join(rootDir, 'frontend/src');
const backendSrc = path.join(rootDir, 'backend/src');

const plugins = [
    {
        slug: 'clientes',
        name: 'Plugin de Clientes',
        version: '1.0.0',
        description: 'Gestão completa de clientes com múltiplos contatos e endereços.',
        files: {
            frontend: [
                { src: 'pages/Clients', dest: 'frontend/src/pages/Clients' }
            ],
            backend: [
                { src: 'controllers/ClientController.ts', dest: 'backend/src/controllers/ClientController.ts' },
                { src: 'models/Client.ts', dest: 'backend/src/models/Client.ts' },
                { src: 'models/ClientAddress.ts', dest: 'backend/src/models/ClientAddress.ts' },
                { src: 'models/ClientContact.ts', dest: 'backend/src/models/ClientContact.ts' },
                { src: 'services/ClientServices', dest: 'backend/src/services/ClientServices' },
                { src: 'routes/clientRoutes.ts', dest: 'backend/src/routes/clientRoutes.ts' },
                { src: 'database/migrations/20260102134600-create-clients-tables.ts', dest: 'backend/migrations/20260102134600-create-clients-tables.ts' }
            ]
        },
        permissions: [
            { name: "view_clients", description: "Visualizar Clientes" },
            { name: "edit_clients", description: "Editar Clientes" },
            { name: "delete_clients", description: "Deletar Clientes" }

        ]
    },
    {
        slug: 'helpdesk',
        name: 'Plugin de Helpdesk',
        version: '1.1.0',
        description: 'Sistema de protocolos com SLA configurável, categorização (ITIL) e histórico completo.',
        files: {
            frontend: [
                { src: 'pages/Helpdesk', dest: 'frontend/src/pages/Helpdesk' }
            ],
            backend: [
                { src: 'controllers/ProtocolController.ts', dest: 'backend/src/controllers/ProtocolController.ts' },
                { src: 'models/Protocol.ts', dest: 'backend/src/models/Protocol.ts' },
                { src: 'models/ProtocolHistory.ts', dest: 'backend/src/models/ProtocolHistory.ts' },
                { src: 'services/ProtocolServices', dest: 'backend/src/services/ProtocolServices' },
                { src: 'routes/protocolRoutes.ts', dest: 'backend/src/routes/protocolRoutes.ts' },
                { src: 'database/migrations/20260102135000-create-protocols-tables.ts', dest: 'backend/migrations/20260102135000-create-protocols-tables.ts' },
                { src: 'database/migrations/20260111000001-seed-helpdesk-settings.ts', dest: 'backend/migrations/20260111000001-seed-helpdesk-settings.ts' }
            ]
        },
        permissions: [
            { name: "view_helpdesk", description: "Visualizar Helpdesk" },
            { name: "edit_helpdesk", description: "Editar Helpdesk" },
            { name: "view_protocols", description: "Visualizar Protocolos" }
        ]
    }
];

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    fs.readdirSync(from).forEach(element => {
        if (fs.lstatSync(path.join(from, element)).isFile()) {
            fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else {
            copyFolderSync(path.join(from, element), path.join(to, element));
        }
    });
}

function generatePermissionSeed(permissions, destPath) {
    const content = `
import { QueryInterface } from "sequelize";

module.exports = {
    up: async (queryInterface: QueryInterface) => {
        const permissions = ${JSON.stringify(permissions, null, 4).replace(/"createdAt":.*/g, 'createdAt: new Date(),').replace(/"updatedAt":.*/g, 'updatedAt: new Date(),')};
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
            name: ${JSON.stringify(permissions.map(p => p.name))}
        }, {});
    }
};
`;
    fs.writeFileSync(destPath, content);
}


if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

plugins.forEach(plugin => {
    const pluginDir = path.join(distDir, plugin.slug);
    fs.mkdirSync(pluginDir);

    // Copy Frontend
    plugin.files.frontend.forEach(file => {
        const srcPath = path.join(frontendSrc, file.src);
        const destPath = path.join(pluginDir, file.dest);
        const destDir = path.dirname(destPath);

        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        if (fs.lstatSync(srcPath).isDirectory()) {
            copyFolderSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    });

    // Copy Backend
    plugin.files.backend.forEach(file => {
        const srcPath = path.join(backendSrc, file.src);
        const destPath = path.join(pluginDir, file.dest);
        const destDir = path.dirname(destPath);

        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

        if (fs.existsSync(srcPath)) {
            if (fs.lstatSync(srcPath).isDirectory()) {
                copyFolderSync(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        } else {
            console.warn(`Warning: File not found ${srcPath}`);
        }

    });

    // Generate Permissions Seed
    const seedDir = path.join(pluginDir, 'backend/migrations');
    if (!fs.existsSync(seedDir)) fs.mkdirSync(seedDir, { recursive: true });
    generatePermissionSeed(plugin.permissions, path.join(seedDir, `${new Date().getFullYear()}${new Date().getMonth()}${new Date().getDate()}000000-seed-permissions.ts`));


    // Create Manifest
    const manifest = {
        name: plugin.name,
        slug: plugin.slug,
        version: plugin.version,
        description: plugin.description,
        type: "plugin"
    };
    fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log(`Packaged ${plugin.slug} to ${pluginDir}`);
});
