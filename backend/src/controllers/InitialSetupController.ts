import { Request, Response } from "express";
import User from "../models/User";
import Tenant from "../models/Tenant";
import Plan from "../models/Plan";
import Setting from "../models/Setting";
import { hash } from "bcryptjs";
import AppError from "../errors/AppError";
import Permission from "../models/Permission";
import Group from "../models/Group";

export const check = async (req: Request, res: Response): Promise<Response> => {
    const userCount = await User.count();
    return res.json({ needsSetup: userCount === 0 });
};

export const setup = async (req: Request, res: Response): Promise<Response> => {
    const userCount = await User.count();
    if (userCount > 0) {
        throw new AppError("System already initialized.", 403);
    }

    const {
        firstName,
        lastName,
        email,
        password,
        document // CPF/CNPJ optional
    } = req.body;

    if (!firstName || !email || !password) {
        throw new AppError("Missing required fields.", 400);
    }

    // 1. Create Default Plan if not exists
    let plan = await Plan.findOne({ where: { name: "Community" } });
    if (!plan) {
        plan = await Plan.create({
            name: "Community",
            pluginQuota: 10,
            price: 0,
            active: true
        });
    }

    // 2. Create first Tenant
    const tenant = await Tenant.create({
        name: `${firstName}'s Workspace`,
        status: "active",
        planId: plan.id,
        document: document || null
    });

    // 3. Create Admin Group
    const group = await Group.create({
        name: "Admin",
        tenantId: tenant.id
    });

    // 4. Assign all permissions to this group
    const permissions = await Permission.findAll();
    await group.$set("permissions", permissions);

    // 5. Create Super Admin User
    const passwordHash = await hash(password, 8);
    const user = await User.create({
        name: `${firstName} ${lastName}`.trim(),
        email,
        passwordHash,
        profile: "superadmin",
        tenantId: tenant.id,
        groupId: group.id
    });

    // 6. Update Tenant Owner
    await tenant.update({ ownerId: user.id });

    // 7. Seed Default Public Settings for the new tenant
    await Setting.bulkCreate([
        { key: "systemTitle", value: "Watink", tenantId: tenant.id },
        { key: "systemLogo", value: "public/logo.png", tenantId: tenant.id },
        { key: "systemLogoEnabled", value: "true", tenantId: tenant.id },
        { key: "login_layout", value: "centered", tenantId: tenant.id },
        { key: "login_backgroundImage", value: "https://images.unsplash.com/photo-1557683316-973673baf926", tenantId: tenant.id }
    ], { ignoreDuplicates: true });

    return res.json({
        message: "System initialized successfully.",
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            tenantId: tenant.id
        }
    });
};
