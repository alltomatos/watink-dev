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
const AppError_1 = __importDefault(require("../errors/AppError"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const isAuditor = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const { user } = req;
    const { ticketId } = req.params;
    if (user.profile === "admin") {
        return next();
    }
    // If user is an auditor
    if (user.profile === "auditor") {
        if (req.method === "GET") {
            return next();
        }
        // For write operations, check if they are taking ownership
        // If the body contains userId matching their own ID, it means they are assigning it to themselves
        if (req.method === "PUT" && ticketId) {
            // We need to fetch the ticket inside the controller or here. 
            // Ideally, the "Take Ownership" action should be a specific route or a specific payload.
            // Assuming "Take Ownership" means setting userId = user.id
            if (Number(req.body.userId) === Number(user.id)) {
                return next();
            }
        }
        // If they are trying to modify something else without ownership
        if (ticketId) {
            const ticket = yield Ticket_1.default.findByPk(ticketId);
            if (ticket && ticket.userId === Number(user.id)) {
                // They own the ticket, so they can modify it
                return next();
            }
        }
        throw new AppError_1.default("ERR_NO_PERMISSION_AUDITOR", 403);
    }
    // For standard users (agents), standard checks or other middlewares apply
    // If this middleware is ONLY for auditors/admins, we might want to just return next() for agents 
    // and let other permissions handle it. 
    // However, the previous logic was: if user.profile !== "user" -> admin. 
    // Let's assume agents have profile "user".
    return next();
});
exports.default = isAuditor;
