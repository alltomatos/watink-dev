
const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist_plugins');
const frontendSrc = path.join(rootDir, 'frontend/src');
const backendSrc = path.join(rootDir, 'legacy/backend/src');

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
        { src: 'controllers/ClientController.ts', dest: 'legacy/backend/src/controllers/ClientController.ts' },
        { src: 'models/Client.ts', dest: 'legacy/backend/src/models/Client.ts' },
        { src: 'models/ClientAddress.ts', dest: 'legacy/backend/src/models/ClientAddress.ts' },
        { src: 'models/ClientContact.ts', dest: 'legacy/backend/src/models/ClientContact.ts' },
        { src: 'services/ClientServices', dest: 'legacy/backend/src/services/ClientServices' },
        { src: 'routes/clientRoutes.ts', dest: 'legacy/backend/src/routes/clientRoutes.ts' },
        { src: 'database/migrations/20260102134600-create-clients-tables.ts', dest: 'legacy/backend/migrations/20260102134600-create-clients-tables.ts' }
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
        { src: 'controllers/ProtocolController.ts', dest: 'legacy/backend/src/controllers/ProtocolController.ts' },
        { src: 'models/Protocol.ts', dest: 'legacy/backend/src/models/Protocol.ts' },
        { src: 'models/ProtocolHistory.ts', dest: 'legacy/backend/src/models/ProtocolHistory.ts' },
        { src: 'services/ProtocolServices', dest: 'legacy/backend/src/services/ProtocolServices' },
        { src: 'routes/protocolRoutes.ts', dest: 'legacy/backend/src/routes/protocolRoutes.ts' },
        { src: 'database/migrations/20260102135000-create-protocols-tables.ts', dest: 'legacy/backend/migrations/20260102135000-create-protocols-tables.ts' }
      ]
    },
    permissions: [
      { name: "view_protocols", description: "Visualizar Protocolos" },
      { name: "edit_protocols", description: "Editar Protocolos" },
      { name: "delete_protocols", description: "Deletar Protocolos" }
    ]
  }
];

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  if (!exists) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(child => {
      copyRecursiveSync(path.join(src, child), path.join(dest, child));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

plugins.forEach(plugin => {
  const pluginDir = path.join(distDir, plugin.slug);
  fs.mkdirSync(pluginDir, { recursive: true });

  // Copy frontend files
  plugin.files.frontend.forEach(file => {
    const src = path.join(frontendSrc, file.src);
    const dest = path.join(pluginDir, file.dest);
    copyRecursiveSync(src, dest);
  });

  // Copy backend files
  plugin.files.backend.forEach(file => {
    const src = path.join(backendSrc, file.src);
    const dest = path.join(pluginDir, file.dest);
    copyRecursiveSync(src, dest);
  });

  // Generate manifest.json
  const manifest = {
    name: plugin.name,
    slug: plugin.slug,
    version: plugin.version,
    description: plugin.description,
    permissions: plugin.permissions
  };
  fs.writeFileSync(path.join(pluginDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Generate permission seeds
  const seeds = plugin.permissions.map(p => ({
    name: p.name,
    description: p.description
  }));
  fs.writeFileSync(
    path.join(pluginDir, 'backend/migrations/202602000000-seed-permissions.ts'),
    `import { QueryInterface } from 'sequelize';\n\nexport default {\n  up: async (queryInterface: QueryInterface) => {\n    await queryInterface.bulkInsert('Permissions', ${JSON.stringify(seeds, null, 2).replace(/"(\w+)":/g, '$1:')});\n  },\n  down: async (queryInterface: QueryInterface) => {\n    await queryInterface.bulkDelete('Permissions', {\n      name: { [Op.in]: ${JSON.stringify(plugin.permissions.map(p => p.name))} }\n    });\n  }\n};\n`
  );

  console.log(`Plugin "${plugin.slug}" packaged to ${pluginDir}`);
});

console.log('All plugins packaged successfully.');
