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

fs.mkdirSync(publicDir, { recursive: true });

filesToCopy.forEach(file => {
    const srcPath = path.join(assetsDir, file.src);
    const destPath = path.join(publicDir, file.dest);

    try {
        fs.copyFileSync(srcPath, destPath);
        console.log(`Copied ${file.src} to ${file.dest}`);
    } catch (error) {
        if (error && error.code === 'ENOENT') {
            console.warn(`Source file not found: ${srcPath}`);
            return;
        }
        throw error;
    }
});

// Update version.json
const packageJsonPath = path.join(__dirname, 'package.json');
const versionJsonPath = path.join(publicDir, 'version.json');

try {
    const packageJson = require(packageJsonPath);

    let existing = {};
    try {
        existing = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    } catch (error) {
        if (!error || error.code !== 'ENOENT') {
            console.warn('Could not read existing version.json, rebuilding from package.json');
        }
        existing = {};
    }

    const envChangelog = process.env.WATINK_CHANGELOG
        ? process.env.WATINK_CHANGELOG.split('|').map(s => s.trim()).filter(Boolean)
        : null;

    const versionData = {
        service: "frontend",
        version: packageJson.version,
        lastUpdated: new Date().toISOString(),
        changelog: envChangelog || existing.changelog || []
    };

    fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2));
    console.log(`Updated version.json to ${packageJson.version}`);
} catch (error) {
    console.error('Error updating version.json:', error);
}