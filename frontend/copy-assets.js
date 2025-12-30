const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'src', 'assets');
const publicDir = path.join(__dirname, 'public');

const filesToCopy = [
    { src: 'fundo.png', dest: 'login-background.png' },
    { src: 'watink-sf.png', dest: 'logo.png' },
    { src: 'favicon.png', dest: 'favicon.png' },
    { src: 'favicon.png', dest: 'favicon.ico' },
    { src: 'logo-completa.png', dest: 'logo-full.png' },
    { src: 'watink-logo-letras.png', dest: 'logo-text.png' }
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
