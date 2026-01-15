"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerializeUser = void 0;
const SerializeUser = (user) => {
    var _a, _b;
    const groupPermissions = ((_a = user.groups) === null || _a === void 0 ? void 0 : _a.flatMap(g => { var _a; return (_a = g.permissions) === null || _a === void 0 ? void 0 : _a.map((p) => p.name); })) || [];
    const individualPermissions = ((_b = user.permissions) === null || _b === void 0 ? void 0 : _b.map(p => p.name)) || [];
    const allPermissions = [...new Set([...groupPermissions, ...individualPermissions])];
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        profile: user.profile,
        queues: user.queues,
        whatsapp: user.whatsapp,
        permissions: allPermissions,
        tenantId: user.tenantId,
        socialName: user.socialName,
        profileImage: user.profileImage,
        tenant: user.tenant
    };
};
exports.SerializeUser = SerializeUser;
