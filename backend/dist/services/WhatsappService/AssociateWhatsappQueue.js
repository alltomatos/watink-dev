"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AssociateWhatsappQueue = async (whatsapp, queueIds) => {
    await whatsapp.$set("queues", queueIds);
    await whatsapp.reload();
};
exports.default = AssociateWhatsappQueue;
