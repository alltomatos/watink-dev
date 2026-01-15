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
const fs_1 = __importDefault(require("fs"));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require("pdf-parse");
class PdfService {
    parsePdf(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!fs_1.default.existsSync(filePath)) {
                    throw new Error("File not found");
                }
                const dataBuffer = fs_1.default.readFileSync(filePath);
                const data = yield pdf(dataBuffer);
                // Clean up whitespace
                return data.text.replace(/\s+/g, " ").trim();
            }
            catch (error) {
                console.error("PDF Parsing error:", error);
                throw new Error(`Failed to parse PDF: ${error.message}`);
            }
        });
    }
}
exports.default = new PdfService();
