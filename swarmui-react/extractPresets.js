// Script to extract presets from TypeScript file to JSON
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsFile = path.join(__dirname, 'src/stores/promptPresets.ts');
const jsonFile = path.join(__dirname, 'src/data/promptPresets.json');

const content = fs.readFileSync(tsFile, 'utf8');

// Find the DEFAULT_PRESETS array
const startMatch = content.indexOf('const DEFAULT_PRESETS: PromptPreset[] = [');
const endMatch = content.indexOf('];', startMatch);

if (startMatch === -1 || endMatch === -1) {
    console.error('Could not find DEFAULT_PRESETS array');
    process.exit(1);
}

// Extract array content
let arrayContent = content.substring(startMatch + 'const DEFAULT_PRESETS: PromptPreset[] = ['.length, endMatch);

// Convert to valid JSON:
// 1. Replace single quotes with double quotes
// 2. Add quotes around property names
// 3. Handle the regex for property names

// Simple approach: use a regex to convert each object
const presets = [];
const objectRegex = /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*category:\s*'([^']+)',\s*promptText:\s*'([^']+)'(?:,\s*negativePromptText:\s*'([^']+)')?(?:,\s*isDefault:\s*true)?\s*\}/g;

let match;
while ((match = objectRegex.exec(arrayContent)) !== null) {
    const preset = {
        id: match[1],
        name: match[2],
        category: match[3],
        promptText: match[4],
        isDefault: true
    };
    if (match[5]) {
        preset.negativePromptText = match[5];
    }
    presets.push(preset);
}

console.log(`Extracted ${presets.length} presets`);

// Ensure data directory exists
const dataDir = path.dirname(jsonFile);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(jsonFile, JSON.stringify(presets, null, 2));
console.log(`Wrote presets to ${jsonFile}`);
