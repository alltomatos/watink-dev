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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const SerializeUser_1 = require("../../helpers/SerializeUser");
const ShowUserService_1 = __importDefault(require("./ShowUserService"));
const Permission_1 = __importDefault(require("../../models/Permission"));
const UpdateUserService = async ({ userData, userId, requestUser }) => {
    const user = await (0, ShowUserService_1.default)(userId);
    const schema = Yup.object().shape({
        name: Yup.string().min(2),
        email: Yup.string().email(),
        profile: Yup.string(),
        password: Yup.string()
    });
    const { email, password, profile, name, queueIds = [], whatsappId } = userData;
    try {
        await schema.validate({ email, password, profile, name });
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    // Protection: prevent editing superadmin if not self
    if (user.profile === "superadmin" && user.id.toString() !== requestUser.id.toString()) {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    await user.update({
        email,
        password,
        profile,
        name,
        whatsappId: whatsappId ? whatsappId : null
    });
    await user.$set("queues", queueIds);
    // Ensure superadmin has all permissions if profile is being updated to superadmin
    if (profile === "superadmin" || (user.profile === "superadmin" && profile === undefined)) {
        const allPermissions = await Permission_1.default.findAll();
        await user.$set("permissions", allPermissions);
    }
    await user.reload();
    return (0, SerializeUser_1.SerializeUser)(user);
};
exports.default = UpdateUserService;
