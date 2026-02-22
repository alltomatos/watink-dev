const fs = require("fs");
const path = require("path");

const sourceDir = path.resolve(__dirname, "build");
const targetDir = path.resolve(__dirname, "../bussines/internal/web/build");

function copyRecursive(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  
  if (typeof fs.cpSync === 'function') {
    fs.cpSync(src, dest, { recursive: true });
  } else {
    // Fallback para Node.js < 16.7.0
    const copyDir = (s, d) => {
      fs.mkdirSync(d, { recursive: true });
      for (const entry of fs.readdirSync(s, { withFileTypes: true })) {
        const srcPath = path.join(s, entry.name);
        const destPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    copyDir(src, dest);
  }
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
