/**
 * Build script for integrated mode
 * Copies the built React app to SwarmUI's wwwroot folder
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_DIR = path.join(__dirname, '..', 'dist');
const TARGET_DIR = path.join(__dirname, '..', '..', 'src', 'wwwroot', 'react');

function copyRecursive(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(child => {
            copyRecursive(path.join(src, child), path.join(dest, child));
        });
    }
    else {
        fs.copyFileSync(src, dest);
    }
}

function main() {
    console.log('Building React for integrated mode...');
    console.log(`Source: ${SOURCE_DIR}`);
    console.log(`Target: ${TARGET_DIR}`);

    if (!fs.existsSync(SOURCE_DIR)) {
        console.error('Error: dist/ folder not found. Run "npm run build" first.');
        process.exit(1);
    }

    if (fs.existsSync(TARGET_DIR)) {
        fs.rmSync(TARGET_DIR, { recursive: true });
        console.log('Cleaned existing target directory');
    }

    copyRecursive(SOURCE_DIR, TARGET_DIR);
    console.log('Files copied successfully!');

    const indexPath = path.join(TARGET_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');

        html = html.replace(/src="\//g, 'src="/react/');
        html = html.replace(/href="\//g, 'href="/react/');

        fs.writeFileSync(indexPath, html);
        console.log('Updated index.html paths for /react/ route');
    }

    console.log('\nIntegrated build complete.');
    console.log('The React UI will be available at: http://localhost:7801/react/');
}

main();
