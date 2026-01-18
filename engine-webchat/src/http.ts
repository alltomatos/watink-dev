import { createServer, IncomingMessage, ServerResponse } from "http";
import fs from "fs";
import path from "path";
import { logger } from "./logger";

export function startHttpServer() {
    const port = Number(process.env.PORT || 3335);
    const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method === "GET" && req.url === "/version") {
            let version = "1.0.0";
            try {
                const pkgPath = path.join(process.cwd(), "package.json");
                if (fs.existsSync(pkgPath)) {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
                    version = pkg.version || version;
                }
            } catch { }
            const lastUpdated =
                process.env.BUILD_TIMESTAMP ||
                new Date(Number(process.env.BUILD_UNIX_TS || Date.now())).toISOString();
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store");
            res.statusCode = 200;
            res.end(
                JSON.stringify({
                    service: "webchat-engine",
                    version,
                    lastUpdated,
                })
            );
            logger.info(`Version endpoint called - v${version}`);
            return;
        }
        res.statusCode = 404;
        res.end("Not Found");
    });
    server.listen(port, () => {
        logger.info(`HTTP server listening on port ${port}`);
    });
}
