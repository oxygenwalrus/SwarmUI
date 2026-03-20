import { applyCorrections, scanLanguageOffline } from './languageCorrection';

export function prependPromptText(currentValue: string | undefined, nextText: string): string {
    const trimmedCurrent = currentValue?.trim() ?? '';
    const trimmedNext = nextText.trim();

    if (!trimmedNext) {
        return trimmedCurrent;
    }

    return trimmedCurrent ? `${trimmedNext}, ${trimmedCurrent}` : trimmedNext;
}

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
