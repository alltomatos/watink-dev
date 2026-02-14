"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Plugin_1 = __importDefault(require("../../models/Plugin"));
const PluginInstallation_1 = __importDefault(require("../../models/PluginInstallation"));
const Setting_1 = __importDefault(require("../../models/Setting"));
const StopWhatsAppSession_1 = __importDefault(require("../WbotServices/StopWhatsAppSession"));
const DeleteWhatsAppService = async (id) => {
    const whatsapp = await Whatsapp_1.default.findOne({
        where: { id }
    });
    if (!whatsapp) {
        throw new AppError_1.default("ERR_NO_WAPP_FOUND", 404);
    }
    if (whatsapp.status === "CONNECTED" ||
        whatsapp.status === "PAIRING" ||
        whatsapp.status === "OPENING") {
        throw new AppError_1.default("ERR_WAPP_CHECK_BEFORE_DELETE");
    }
    await (0, StopWhatsAppSession_1.default)(whatsapp.id); // [NEW] Ensure session is stopped in engine
    if (whatsapp.engineType === "papi") {
        const plugin = await Plugin_1.default.findOne({ where: { slug: "engine-papi" } });
        if (plugin) {
            const installation = await PluginInstallation_1.default.findOne({
                where: {
                    pluginId: plugin.id,
                    tenantId: whatsapp.tenantId,
                    status: "active"
                }
            });
            if (installation) {
                const urlSetting = await Setting_1.default.findOne({
                    where: { key: "papiUrl", tenantId: whatsapp.tenantId }
                });
                const keySetting = await Setting_1.default.findOne({
                    where: { key: "papiKey", tenantId: whatsapp.tenantId }
                });
                if (urlSetting?.value && keySetting?.value) {
                    try {
                        await axios_1.default.delete(`${urlSetting.value}/api/instances/${whatsapp.id}`, {
                            headers: {
                                "x-api-key": keySetting.value
                            }
                        });
                    }
                    catch (err) {
                        console.error(`Failed to delete PAPI instance ${whatsapp.id}:`, err.message);
                    }
                }
            }
        }
    }
    await whatsapp.destroy();
};
exports.default = DeleteWhatsAppService;
