const fs = require("fs");
const path = require("path");

const sourceDir = path.resolve(__dirname, "build");
const targetDir = path.resolve(__dirname, "../bussines/internal/web/build");

function copyRecursive(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
}

try {
  if (!fs.existsSync(sourceDir)) {
    console.error("❌ Frontend build folder not found:", sourceDir);
    process.exit(1);
  }

  copyRecursive(sourceDir, targetDir);
  console.log("✅ Frontend synced to Go embed:", targetDir);
} catch (err) {
  console.error("❌ Failed to sync frontend to Go embed:", err.message);
  process.exit(1);
}
