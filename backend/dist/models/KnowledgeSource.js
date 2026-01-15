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
const KnowledgeBase_1 = __importDefault(require("./KnowledgeBase"));
const KnowledgeVector_1 = __importDefault(require("./KnowledgeVector"));
const Tenant_1 = __importDefault(require("./Tenant"));
let KnowledgeSource = class KnowledgeSource extends sequelize_typescript_1.Model {
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], KnowledgeSource.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => KnowledgeBase_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], KnowledgeSource.prototype, "baseId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => KnowledgeBase_1.default),
    __metadata("design:type", KnowledgeBase_1.default)
], KnowledgeSource.prototype, "knowledgeBase", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], KnowledgeSource.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(false),
    (0, sequelize_typescript_1.Default)("text"),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM("url", "pdf", "text")),
    __metadata("design:type", String)
], KnowledgeSource.prototype, "type", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], KnowledgeSource.prototype, "url", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.TEXT),
    __metadata("design:type", String)
], KnowledgeSource.prototype, "content", void 0);
__decorate([
    (0, sequelize_typescript_1.AllowNull)(true),
    (0, sequelize_typescript_1.Default)("pending"),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.ENUM("pending", "processing", "indexed", "error")),
    __metadata("design:type", String)
], KnowledgeSource.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Tenant_1.default),
    (0, sequelize_typescript_1.Column)(sequelize_typescript_1.DataType.UUID),
    __metadata("design:type", String)
], KnowledgeSource.prototype, "tenantId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Tenant_1.default),
    __metadata("design:type", Tenant_1.default)
], KnowledgeSource.prototype, "tenant", void 0);
__decorate([
    (0, sequelize_typescript_1.HasMany)(() => KnowledgeVector_1.default),
    __metadata("design:type", Array)
], KnowledgeSource.prototype, "vectors", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], KnowledgeSource.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], KnowledgeSource.prototype, "updatedAt", void 0);
KnowledgeSource = __decorate([
    sequelize_typescript_1.Table
], KnowledgeSource);
exports.default = KnowledgeSource;
