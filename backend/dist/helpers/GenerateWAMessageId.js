"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const GenerateWAMessageId = () => {
    return "3EB0" + Math.random().toString(36).slice(2).toUpperCase() + Math.random().toString(36).slice(2).toUpperCase().substring(0, 12);
};
exports.default = GenerateWAMessageId;
