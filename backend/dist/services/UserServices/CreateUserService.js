"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const SerializeUser_1 = require("../../helpers/SerializeUser");
const User_1 = __importDefault(require("../../models/User"));
const ShowUserService_1 = __importDefault(require("./ShowUserService"));
const Tenant_1 = __importDefault(require("../../models/Tenant"));
const PluginInstallation_1 = __importDefault(require("../../models/PluginInstallation"));
const Plugin_1 = __importDefault(require("../../models/Plugin"));
const sequelize_1 = require("sequelize");
const SendVerificationEmailService_1 = __importDefault(require("./SendVerificationEmailService"));
const CreateUserService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ email, password, name, queueIds = [], whatsappId, groupIds = [], groupId, tenantId }) {
    let finalGroupIds = [...groupIds];
    if (groupId && !finalGroupIds.includes(groupId)) {
        finalGroupIds.push(groupId);
    }
    const schema = Yup.object().shape({
        name: Yup.string().required().min(2),
        email: Yup.string()
            .email()
            .required()
            .test("Check-email", "An user with this email already exists.", (value) => __awaiter(void 0, void 0, void 0, function* () {
            if (!value)
                return false;
            const emailExists = yield User_1.default.findOne({
                where: { email: value }
            });
            return !emailExists;
        })),
        password: Yup.string().required().min(5)
    });
    try {
        yield schema.validate({ email, password, name });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    /*
     * Check if SMTP Plugin is active.
     * If NOT active, we simply create the user as verified and don't send the email.
     */
    let emailVerified = false;
    if (tenantId) {
        const smtpPlugin = yield Plugin_1.default.findOne({
            where: {
                slug: {
                    [sequelize_1.Op.like]: "%smtp%"
                }
            }
        });
        if (smtpPlugin) {
            const pluginInstallation = yield PluginInstallation_1.default.findOne({
                where: {
                    tenantId,
                    pluginId: smtpPlugin.id,
                    status: "active"
                }
            });
            if (!pluginInstallation) {
                emailVerified = true;
            }
        }
        else {
            emailVerified = true;
        }
    }
    else {
        emailVerified = true;
    }
    if (process.env.TENANTS === "true" && tenantId) {
        const tenant = yield Tenant_1.default.findOne({ where: { id: tenantId } });
        if (tenant) {
            const userCount = yield User_1.default.count({ where: { tenantId } });
            if (userCount >= tenant.maxUsers) {
                throw new AppError_1.default("ERR_MAX_USERS_REACHED", 403);
            }
        }
    }
    const user = yield User_1.default.create({
        email,
        password,
        name,
        whatsappId: whatsappId ? whatsappId : null,
        tenantId,
        emailVerified
    }, { include: ["queues", "whatsapp"] });
    yield user.$set("queues", queueIds);
    yield user.$set("groups", finalGroupIds, { through: { tenantId } });
    // Send Verification Email (Async)
    if (tenantId && !emailVerified) {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        try {
            yield (0, SendVerificationEmailService_1.default)(email, frontendUrl);
        }
        catch (err) {
            console.error("Failed to send verification email", err);
        }
    }
    // await user.reload();
    const createdUser = yield (0, ShowUserService_1.default)(user.id);
    return (0, SerializeUser_1.SerializeUser)(createdUser);
});
exports.default = CreateUserService;
