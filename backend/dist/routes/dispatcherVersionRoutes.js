"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const dispatcherRoutes = (0, express_1.Router)();
/**
 * @openapi
 * /dispatcher/version:
 *   get:
 *     summary: Retorna a versão do serviço Dispatcher
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Versão do Dispatcher
 */
dispatcherRoutes.get("/dispatcher/version", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data } = yield axios_1.default.get("http://dispatcher-service:3337/version", {
            headers: { "Cache-Control": "no-store" },
            timeout: 1500,
        });
        res.setHeader("Cache-Control", "no-store");
        res.status(200).json(data);
    }
    catch (e) {
        res.status(502).json({ error: "Dispatcher Unavailable" });
    }
}));
exports.default = dispatcherRoutes;
