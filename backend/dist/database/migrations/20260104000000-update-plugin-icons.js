"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    up: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // Update 'clientes' plugin
        yield queryInterface.sequelize.query(`
      UPDATE "Plugins"
      SET "iconUrl" = '/public/assets/icons/ico-crm.png'
      WHERE "slug" = 'clientes';
    `);
        // Update 'helpdesk' plugin
        yield queryInterface.sequelize.query(`
      UPDATE "Plugins"
      SET "iconUrl" = '/public/assets/icons/ico-helpdesk.png'
      WHERE "slug" = 'helpdesk';
    `);
        // Update 'whatsmeow' plugin
        yield queryInterface.sequelize.query(`
      UPDATE "Plugins"
      SET "iconUrl" = '/public/assets/icons/ico-chat.png'
      WHERE "slug" = 'whatsmeow';
    `);
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        // Revert to original URLs (optional, but good practice)
        yield queryInterface.sequelize.query(`
      UPDATE "Plugins"
      SET "iconUrl" = 'https://plugins.watink.com/clientes/icon.png'
      WHERE "slug" = 'clientes';
    `);
        yield queryInterface.sequelize.query(`
      UPDATE "Plugins"
      SET "iconUrl" = 'https://plugins.watink.com/helpdesk/icon.png'
      WHERE "slug" = 'helpdesk';
    `);
        yield queryInterface.sequelize.query(`
      UPDATE "Plugins"
      SET "iconUrl" = 'https://plugins.watink.com/whatsmeow/icon.png'
      WHERE "slug" = 'whatsmeow';
    `);
    })
};
