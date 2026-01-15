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
const Pipeline_1 = __importDefault(require("./Pipeline"));
let PipelineStage = class PipelineStage extends sequelize_typescript_1.Model {
};
__decorate([
    sequelize_typescript_1.PrimaryKey,
    sequelize_typescript_1.AutoIncrement,
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], PipelineStage.prototype, "id", void 0);
__decorate([
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], PipelineStage.prototype, "name", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)('#E2E8F0'),
    sequelize_typescript_1.Column,
    __metadata("design:type", String)
], PipelineStage.prototype, "color", void 0);
__decorate([
    (0, sequelize_typescript_1.Default)(0),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], PipelineStage.prototype, "order", void 0);
__decorate([
    (0, sequelize_typescript_1.ForeignKey)(() => Pipeline_1.default),
    sequelize_typescript_1.Column,
    __metadata("design:type", Number)
], PipelineStage.prototype, "pipelineId", void 0);
__decorate([
    (0, sequelize_typescript_1.BelongsTo)(() => Pipeline_1.default),
    __metadata("design:type", Pipeline_1.default)
], PipelineStage.prototype, "pipeline", void 0);
__decorate([
    sequelize_typescript_1.CreatedAt,
    __metadata("design:type", Date)
], PipelineStage.prototype, "createdAt", void 0);
__decorate([
    sequelize_typescript_1.UpdatedAt,
    __metadata("design:type", Date)
], PipelineStage.prototype, "updatedAt", void 0);
PipelineStage = __decorate([
    sequelize_typescript_1.Table
], PipelineStage);
exports.default = PipelineStage;
