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
const puppeteer_1 = __importDefault(require("puppeteer"));
class ScraperService {
    scrape(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Try Simple Fetch first (faster)
                // const response = await fetch(url);
                // const html = await response.text();
                // const $ = cheerio.load(html);
                // // Remove scripts, styles
                // $("script").remove();
                // $("style").remove();
                // return $("body").text().replace(/\s+/g, " ").trim();
                // 2. Use Puppeteer for better compatibility (SPA, JS render)
                const browser = yield puppeteer_1.default.launch({
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
                    args: [
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-gpu"
                    ],
                    headless: true
                });
                const page = yield browser.newPage();
                // Set a reasonable timeout
                yield page.setDefaultNavigationTimeout(30000); // 30s
                yield page.goto(url, { waitUntil: "networkidle2" });
                // Extract text from body
                const content = yield page.evaluate(() => {
                    // Remove script and style elements
                    const scripts = document.querySelectorAll("script, style");
                    scripts.forEach((script) => script.remove());
                    // Get text content
                    return document.body.innerText;
                });
                yield browser.close();
                // Clean up whitespace
                return content.replace(/\s+/g, " ").trim();
            }
            catch (error) {
                console.error("Scraping error:", error);
                throw new Error(`Failed to scrape URL: ${error.message}`);
            }
        });
    }
}
exports.default = new ScraperService();
