"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializeUser = void 0;
const SerializeUser = (user) => {
    const groupPermissions = user.group?.permissions?.map(p => p.name) || [];
    const individualPermissions = user.permissions?.map(p => p.name) || [];
    const allPermissions = [...new Set([...groupPermissions, ...individualPermissions])];
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        queues: user.queues,
        whatsapp: user.whatsapp,
        permissions: allPermissions,
        tenantId: user.tenantId
    };
};
exports.SerializeUser = SerializeUser;
