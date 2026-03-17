/**
 * Language Correction Utility
 * Offline-first: use native Electron spellcheck scanning when available,
 * then local typo-map fallback, then optional LanguageTool API fallback.
 */

export interface LanguageReplacement {
    value: string;
}

export interface LanguageMatch {
    message: string;
    shortMessage?: string;
    offset: number;
    length: number;
    replacements: LanguageReplacement[];
    rule: {
        id: string;
        description: string;
        category: {
            id: string;
            name: string;
        };
    };
}

export interface LanguageCheckResult {
    matches: LanguageMatch[];
    language: {
        name: string;
        code: string;
    };
    source: 'native-offline' | 'local-offline' | 'languagetool-online';
}

interface NativeSpellIssue {
    startIndex: number;
    length: number;
    word: string;
    suggestions: string[];
}

const ignoredSpellWords = new Set<string>();
let ignoredWordsLoaded = false;
let ignoredWordListenerAttached = false;

const COMMON_TYPOS: Record<string, string> = {
    teh: 'the',
    recieve: 'receive',
    recieveing: 'receiving',
    seperate: 'separate',
    definately: 'definitely',
    accomodate: 'accommodate',
    adress: 'address',
    becuase: 'because',
    goverment: 'government',
    wierd: 'weird',
    freind: 'friend',
    acheive: 'achieve',
    argumnt: 'argument',
    enviroment: 'environment',
    langauge: 'language',
    grammer: 'grammar',
    speling: 'spelling',
    sentance: 'sentence',
    thier: 'their',
    alot: 'a lot',
    tommorow: 'tomorrow',
    occured: 'occurred',
    embarass: 'embarrass',
    untill: 'until',
    wich: 'which',
    waht: 'what',
    dont: "don't",
    cant: "can't",
    wont: "won't",
    doesnt: "doesn't",
    isnt: "isn't",
};

function titleCaseWord(value: string): string {
    if (!value.length) return value;
    return value[0].toUpperCase() + value.slice(1);
}

function applyCasePattern(original: string, replacement: string): string {
    if (!replacement) return replacement;
    if (original === original.toUpperCase()) return replacement.toUpperCase();
    if (original[0] === original[0].toUpperCase()) return titleCaseWord(replacement);
    return replacement;
}

function levenshteinDistance(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const prev = new Array<number>(b.length + 1);
    const curr = new Array<number>(b.length + 1);

    for (let j = 0; j <= b.length; j++) prev[j] = j;

    for (let i = 1; i <= a.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[j] = Math.min(
                prev[j] + 1,
                curr[j - 1] + 1,
                prev[j - 1] + cost
            );
        }
        for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
    }

    return prev[b.length];
}

function isConservativeReplacement(original: string, replacement: string): boolean {
    const a = original.toLowerCase();
    const b = replacement.toLowerCase();
    if (!a || !b || a === b) return false;
    if (a.length < 3 || b.length < 3) return false;
    if (a[0] !== b[0]) return false;

    const distance = levenshteinDistance(a, b);
    return distance <= 2;
}

function hasElectronNativeSpellcheck(): boolean {
    if (typeof window === 'undefined') return false;
    const bridge = window.electron;
    if (!bridge?.hasNativeSpellcheck) return false;

    try {
        return bridge.hasNativeSpellcheck();
    } catch {
        return false;
    }
}

function ensureIgnoredWordsInitialized(): void {
    if (typeof window === 'undefined') return;
    const bridge = window.electron;
    if (!bridge) return;

    if (!ignoredWordListenerAttached && bridge.onIgnoredSpellWordsUpdated) {
        bridge.onIgnoredSpellWordsUpdated((words) => {
            ignoredSpellWords.clear();
            for (const word of words || []) {
                ignoredSpellWords.add(word.toLowerCase());
            }
        });
        ignoredWordListenerAttached = true;
    }

    if (!ignoredWordsLoaded && bridge.getIgnoredSpellWords) {
        ignoredWordsLoaded = true;
        bridge.getIgnoredSpellWords()
            .then((words) => {
                ignoredSpellWords.clear();
                for (const word of words || []) {
                    ignoredSpellWords.add(word.toLowerCase());
                }
            })
            .catch((error) => {
                console.error('[LanguageCorrection] Failed to load ignored spell words:', error);
            });
    }
}

function getElectronNativeSpellIssues(text: string): NativeSpellIssue[] {
    if (typeof window === 'undefined') return [];
    const bridge = window.electron;
    if (!bridge?.scanTextForMisspellings) return [];
    if (!hasElectronNativeSpellcheck()) return [];

    try {
        return bridge.scanTextForMisspellings(text);
    } catch (error) {
        console.error('[LanguageCorrection] Native spellcheck scan failed:', error);
        return [];
    }
}

function scanWithNativeSpellcheck(text: string): LanguageMatch[] {
    ensureIgnoredWordsInitialized();
    const issues = getElectronNativeSpellIssues(text);

    return issues
        .filter((issue) => !ignoredSpellWords.has(issue.word.toLowerCase()))
        .map((issue): LanguageMatch => {
        const filteredSuggestions = issue.suggestions
            .filter(suggestion => isConservativeReplacement(issue.word, suggestion))
            .map(suggestion => ({ value: applyCasePattern(issue.word, suggestion) }));

        return {
            message: `Possible misspelling: "${issue.word}"`,
            shortMessage: 'Check spelling',
            offset: issue.startIndex,
            length: issue.length,
            replacements: filteredSuggestions,
            rule: {
                id: 'NATIVE_SPELLCHECK',
                description: 'Native platform spellcheck suggestion',
                category: {
                    id: 'TYPOS',
                    name: 'Possible Typo',
                },
            },
        };
        });
}

function scanWithLocalTypoMap(text: string): LanguageMatch[] {
    ensureIgnoredWordsInitialized();
    const matches: LanguageMatch[] = [];
    const wordRegex = /\p{L}[\p{L}'-]*/gu;

    for (const match of text.matchAll(wordRegex)) {
        const word = match[0];
        const offset = match.index;
        if (typeof offset !== 'number') continue;
        if (ignoredSpellWords.has(word.toLowerCase())) continue;

        const replacement = COMMON_TYPOS[word.toLowerCase()];
        if (!replacement) continue;

        matches.push({
            message: `Possible misspelling: "${word}"`,
            shortMessage: 'Check spelling',
            offset,
            length: word.length,
            replacements: [{ value: applyCasePattern(word, replacement) }],
            rule: {
                id: 'LOCAL_TYPO_MAP',
                description: 'Local offline typo correction',
                category: {
                    id: 'TYPOS',
                    name: 'Possible Typo',
                },
            },
        });
    }

    return matches;
}

/**
 * Scan text for language issues without internet access.
 * Uses native Electron spellcheck if available, otherwise local typo map.
 */
export function scanLanguageOffline(
    text: string,
    language: string = 'en-US'
): LanguageCheckResult {
    if (hasElectronNativeSpellcheck()) {
        return {
            matches: scanWithNativeSpellcheck(text),
            language: { name: 'English', code: language },
            source: 'native-offline',
        };
    }

    return {
        matches: scanWithLocalTypoMap(text),
        language: { name: 'English', code: language },
        source: 'local-offline',
    };
}

/**
 * Check text for language issues.
 * Strategy:
 * 1) Native spellcheck scan in Electron (offline)
 * 2) Local typo map fallback (offline)
 * 3) LanguageTool API fallback when online
 */
export async function checkLanguage(
    text: string,
    language: string = 'en-US'
): Promise<LanguageCheckResult> {
    const offlineResult = scanLanguageOffline(text, language);

    // If native spellcheck is available, stay offline by default.
    if (offlineResult.source === 'native-offline') {
        return offlineResult;
    }

    // Local map found issues, keep offline result.
    if (offlineResult.matches.length > 0) {
        return offlineResult;
    }

    // No network means we must remain offline.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return offlineResult;
    }

    const apiUrl = 'https://api.languagetool.org/v2/check';
    const formData = new URLSearchParams();
    formData.append('text', text);
    formData.append('language', language);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            throw new Error(`LanguageTool API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            matches: data.matches || [],
            language: data.language || { name: 'English', code: 'en-US' },
            source: 'languagetool-online',
        };
    } catch (error) {
        console.error('[LanguageCorrection] API error:', error);
        return offlineResult;
    }
}

/**
 * Apply all language corrections to text
 * @param text Original text
 * @param matches Array of language matches
 * @returns Corrected text with all first suggestions applied
 */
export function applyCorrections(text: string, matches: LanguageMatch[]): string {
    if (!matches.length) return text;

    // Sort matches by offset in reverse order to apply from end to start.
    // This prevents offset shifts when making replacements.
    const sortedMatches = [...matches].sort((a, b) => b.offset - a.offset);

    let corrected = text;
    for (const match of sortedMatches) {
        if (match.replacements && match.replacements.length > 0) {
            const replacement = match.replacements[0].value;
            if (replacement) {
                const before = corrected.substring(0, match.offset);
                const after = corrected.substring(match.offset + match.length);
                corrected = before + replacement + after;
            }
        }
    }

    return corrected;
}

/**
 * Format language issues as a human-readable summary
 */
export function formatIssuesSummary(matches: LanguageMatch[]): string {
    if (!matches.length) return 'No issues found!';

    const issues = matches.map(m => `- ${m.message}`).join('\n');
    return `Found ${matches.length} issue(s):\n${issues}`;
}
