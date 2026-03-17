import { applyCorrections, scanLanguageOffline } from './languageCorrection';

/**
 * Prompt-focused text cleanup and conservative spelling correction.
 */
export function autocorrectPromptText(text: string): string {
    let corrected = text;

    corrected = corrected.replace(/  +/g, ' ');
    corrected = corrected.replace(/,+/g, ',');
    corrected = corrected.replace(/,\s*,/g, ',');
    corrected = corrected.replace(/\s+,/g, ',');
    corrected = corrected.replace(/,([^\s)])/g, ', $1');
    corrected = corrected.split('\n').map(line => line.trim()).join('\n');
    corrected = corrected.replace(/\n{3,}/g, '\n\n');
    corrected = corrected.replace(/,\s*\n/g, '\n');
    corrected = corrected.replace(/\(\s+/g, '(');
    corrected = corrected.replace(/\s+\)/g, ')');

    const scanResult = scanLanguageOffline(corrected);
    if (scanResult.matches.length > 0) {
        corrected = applyCorrections(corrected, scanResult.matches);
    }

    return corrected.trim();
}
