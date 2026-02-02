"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializeUser = void 0;
const SerializeUser = (user) => {
    var _a, _b, _c, _d;
    // Enterprise RBAC: Permissions are resource:action
    // Collect from: 1) Group Roles, 2) Direct Roles, 3) Direct Group Permissions
    const groupRoles = ((_a = user.groups) === null || _a === void 0 ? void 0 : _a.flatMap(g => { var _a; return (_a = g.roles) === null || _a === void 0 ? void 0 : _a.flatMap(r => { var _a; return (_a = r.permissions) === null || _a === void 0 ? void 0 : _a.map(p => `${p.resource}:${p.action}`); }); })) || [];
    const groupDirect = ((_b = user.groups) === null || _b === void 0 ? void 0 : _b.flatMap(g => { var _a; return (_a = g.permissions) === null || _a === void 0 ? void 0 : _a.map(p => `${p.resource}:${p.action}`); })) || [];
    const directRoles = ((_c = user.roles) === null || _c === void 0 ? void 0 : _c.flatMap(r => { var _a; return (_a = r.permissions) === null || _a === void 0 ? void 0 : _a.map(p => `${p.resource}:${p.action}`); })) || [];
    const allPermissions = [...new Set([...groupRoles, ...groupDirect, ...directRoles])];
    // Determine profile based on roles for legacy compatibility
    const isAdmin = ((_d = user.roles) === null || _d === void 0 ? void 0 : _d.some(role => role.name === "Admin")) || user.email === "admin@admin.com";
    const profile = isAdmin ? "admin" : "user";
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        profileImage: user.profileImage,
        queues: user.queues,
        whatsapp: user.whatsapp,
        permissions: allPermissions,
        tenantId: user.tenantId,
        emailVerified: user.emailVerified,
        profile
    };
};
exports.SerializeUser = SerializeUser;
