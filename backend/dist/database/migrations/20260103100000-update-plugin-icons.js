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
        yield queryInterface.bulkUpdate("Plugins", { iconUrl: "/assets/plugins/clientes/icon.png" }, { slug: "clientes" });
        yield queryInterface.bulkUpdate("Plugins", { iconUrl: "/assets/plugins/helpdesk/icon.png" }, { slug: "helpdesk" });
        yield queryInterface.bulkUpdate("Plugins", { iconUrl: "/assets/plugins/whatsmeow/icon.png" }, { slug: "whatsmeow" });
    }),
    down: (queryInterface) => __awaiter(void 0, void 0, void 0, function* () {
        yield queryInterface.bulkUpdate("Plugins", { iconUrl: "https://plugins.watink.com/clientes/icon.png" }, { slug: "clientes" });
        yield queryInterface.bulkUpdate("Plugins", { iconUrl: "https://plugins.watink.com/helpdesk/icon.png" }, { slug: "helpdesk" });
        yield queryInterface.bulkUpdate("Plugins", { iconUrl: "https://plugins.watink.com/whatsmeow/icon.png" }, { slug: "whatsmeow" });
    })
};
