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
const AppError_1 = __importDefault(require("../errors/AppError"));
const PermissionService_1 = __importDefault(require("../services/PermissionServices/PermissionService"));
/**
 * Enterprise Middleware for RBAC
 * Usage: checkPermission("tickets:read") or checkPermission("contacts:process")
 */
const checkPermission = (resourceAction) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        const { id, tenantId } = req.user;
        const [resource, action] = resourceAction.split(":");
        if (!resource || !action) {
            throw new Error("Invalid permission format. Expected 'resource:action'");
        }
        try {
            const result = yield PermissionService_1.default.check(parseInt(id.toString()), tenantId, resource, action);
            if (!result.authorized) {
                throw new AppError_1.default("ERR_NO_PERMISSION", 403);
            }
            // Inject scope for controllers
            req.permissionScope = result.scope;
            return next();
        }
        catch (err) {
            console.error(err);
            if (err instanceof AppError_1.default)
                throw err;
            throw new AppError_1.default("ERR_PERMISSION_CHECK_FAILED", 500);
        }
    });
};
exports.default = checkPermission;
