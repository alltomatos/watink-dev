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
const Group_1 = __importDefault(require("./Group"));
const GroupPermission_1 = __importDefault(require("./GroupPermission"));
const User_1 = __importDefault(require("./User"));
const UserPermission_1 = __importDefault(require("./UserPermission"));
let Permission = class Permission extends sequelize_typescript_1.Model {
    get name() {
        return `${this.resource}:${this.action}`;
    }
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], Permission.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING),
    __metadata("design:type", String)
], Permission.prototype, "resource", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING),
    __metadata("design:type", String)
], Permission.prototype, "action", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.VIRTUAL),
    __metadata("design:type", String),
    __metadata("design:paramtypes", [])
], Permission.prototype, "name", null);
__decorate([
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.STRING),
    __metadata("design:type", String)
], Permission.prototype, "description", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsToMany)(() => Group_1.default, () => GroupPermission_1.default),
    __metadata("design:type", Array)
], Permission.prototype, "groups", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsToMany)(() => User_1.default, () => UserPermission_1.default),
    __metadata("design:type", Array)
], Permission.prototype, "users", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], Permission.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], Permission.prototype, "updatedAt", void 0);
Permission = __decorate([
    sequelize_typescript_1.Table
], Permission);
exports.default = Permission;
