"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_typescript_1 = require("sequelize-typescript");
const bcryptjs_1 = require("bcryptjs");
const Ticket_1 = __importDefault(require("./Ticket"));
const Queue_1 = __importDefault(require("./Queue"));
const UserQueue_1 = __importDefault(require("./UserQueue"));
const Whatsapp_1 = __importDefault(require("./Whatsapp"));
const Tenant_1 = __importDefault(require("./Tenant"));
const Group_1 = __importDefault(require("./Group"));
const Permission_1 = __importDefault(require("./Permission"));
const UserPermission_1 = __importDefault(require("./UserPermission"));
let User = class User extends sequelize_typescript_1.Model {
    constructor() {
        super(...arguments);
        this.checkPassword = async (password) => {
            return (0, bcryptjs_1.compare)(password, this.getDataValue("passwordHash"));
        };
    }
};
User.hashPassword = async (instance) => {
    if (instance.password) {
        instance.passwordHash = await (0, bcryptjs_1.hash)(instance.password, 8);
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.VIRTUAL),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(0),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], User.prototype, "tokenVersion", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)("admin"),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], User.prototype, "profile", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Whatsapp_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], User.prototype, "whatsappId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Whatsapp_1.default),
    __metadata("design:type", Whatsapp_1.default)
], User.prototype, "whatsapp", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => Ticket_1.default),
    __metadata("design:type", Array)
], User.prototype, "tickets", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsToMany)(() => Queue_1.default, () => UserQueue_1.default),
    __metadata("design:type", Array)
], User.prototype, "queues", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Tenant_1.default),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID),
    __metadata("design:type", Object)
], User.prototype, "tenantId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Tenant_1.default),
    __metadata("design:type", Tenant_1.default)
], User.prototype, "tenant", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Group_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], User.prototype, "groupId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Group_1.default),
    __metadata("design:type", Group_1.default)
], User.prototype, "group", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsToMany)(() => Permission_1.default, () => UserPermission_1.default),
    __metadata("design:type", Array)
], User.prototype, "permissions", void 0);
__decorate([
    sequelize_typescript_1.BeforeUpdate,
    sequelize_typescript_1.BeforeCreate,
    __metadata("design:type", Object)
], User, "hashPassword", void 0);
User = __decorate([
    sequelize_typescript_1.Table
], User);
exports.default = User;
