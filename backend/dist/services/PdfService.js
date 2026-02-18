"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require("pdf-parse");
class PdfService {
    async parsePdf(filePath) {
        try {
            if (!fs_1.default.existsSync(filePath)) {
                throw new Error("File not found");
            }
            const dataBuffer = fs_1.default.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            // Clean up whitespace
            return data.text.replace(/\s+/g, " ").trim();
        }
        catch (error) {
            console.error("PDF Parsing error:", error);
            throw new Error(`Failed to parse PDF: ${error.message}`);
        }
    }
}
exports.default = new PdfService();
