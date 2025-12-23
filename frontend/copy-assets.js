const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'src', 'assets');
const publicDir = path.join(__dirname, 'public');

const filesToCopy = [
    { src: 'fundo.png', dest: 'login-background.png' },
    { src: 'watic-premiun-log.png', dest: 'logo.png' },
    { src: 'watic-logo-favicon.png', dest: 'favicon.png' },
    { src: 'watic-logo-favicon.png', dest: 'favicon.ico' } // Fallback for ico
];

if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

filesToCopy.forEach(file => {
    const srcPath = path.join(assetsDir, file.src);
    const destPath = path.join(publicDir, file.dest);

    if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file.src} to ${file.dest}`);
    } else {
        console.warn(`Source file not found: ${srcPath}`);
    }
});
