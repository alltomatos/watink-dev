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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const StartWhatsAppSession_1 = require("./StartWhatsAppSession");
const RestartAllWhatsAppsService = (companyId) => __awaiter(void 0, void 0, void 0, function* () {
    const whatsapps = yield Whatsapp_1.default.findAll({
        where: {
            tenantId: companyId
        }
    });
    yield Promise.all(whatsapps.map((whatsapp) => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, false, undefined, true);
    })));
});
exports.default = RestartAllWhatsAppsService;
