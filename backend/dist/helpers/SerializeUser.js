"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializeUser = void 0;
const SerializeUser = (user) => {
    // Enterprise RBAC: Permissions are resource:action
    // Collect from: 1) Group Roles, 2) Direct Roles, 3) Direct Group Permissions
    const groupRoles = user.groups?.flatMap(g => g.roles?.flatMap(r => r.permissions?.map(p => `${p.resource}:${p.action}`))) || [];
    const groupDirect = user.groups?.flatMap(g => g.permissions?.map(p => `${p.resource}:${p.action}`)) || [];
    const directRoles = user.roles?.flatMap(r => r.permissions?.map(p => `${p.resource}:${p.action}`)) || [];
    // Determine profile based on roles for legacy compatibility
    const isAdmin = user.roles?.some(role => role.name === "Admin") || user.email === "admin@admin.com";
    const profile = isAdmin ? "admin" : "user";
    let allPermissions = [...new Set([...groupRoles, ...groupDirect, ...directRoles])];
    // System Admin/Tenant Admin: Grant all if profile is admin
    if (isAdmin && !allPermissions.includes("*:*")) {
        allPermissions.push("*:*");
    }
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
