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
const Flow_1 = __importDefault(require("./Flow"));
let FlowSession = class FlowSession extends sequelize_typescript_1.Model {
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], FlowSession.prototype, "id", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Flow_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], FlowSession.prototype, "flowId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Flow_1.default),
    __metadata("design:type", Flow_1.default)
], FlowSession.prototype, "flow", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], FlowSession.prototype, "currentStepId", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({ defaultValue: "active" }),
    __metadata("design:type", String)
], FlowSession.prototype, "status", void 0);
__decorate([
    (0, sequelize_typescript_1.Column)({
        type: sequelize_typescript_1.DataType.JSONB,
        defaultValue: {}
    }),
    __metadata("design:type", Object)
], FlowSession.prototype, "context", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], FlowSession.prototype, "entityId", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], FlowSession.prototype, "entityType", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], FlowSession.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], FlowSession.prototype, "updatedAt", void 0);
FlowSession = __decorate([
    sequelize_typescript_1.Table
], FlowSession);
exports.default = FlowSession;
