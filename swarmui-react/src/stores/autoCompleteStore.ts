/**
 * AutoComplete Store
 * Manages word list autocompletions loaded from the SwarmUI backend.
 * Supports danbooru, e621, and other tag-based autocomplete sources.
 */

import { create } from 'zustand';

/**
 * Individual autocomplete entry parsed from backend data.
 * Backend format: "DisplayName\nlowercase_clean\ntag_type\ncount\nalternatives"
 */
export interface AutoCompleteEntry {
    /** Display name of the tag */
    name: string;
    /** Lowercase normalized version for matching (underscores instead of spaces) */
    low: string;
    /** Clean display name */
    clean: string;
    /** Original raw string from backend */
    raw: string;
    /** Usage count for frequency-based sorting */
    count: number;
    /** Formatted count for display (e.g., "1.2M", "500K") */
    countDisplay: string;
    /** Category 0-5 for coloring (general, artist, copyright, character, meta, custom) */
    tag: number;
    /** Alternative names for matching */
    alts: string[];
}

export type SortMode = 'Active' | 'Alphabetical' | 'Frequency' | 'None';
export type MatchMode = 'Bucketed' | 'Contains' | 'StartsWith';

export interface SearchOptions {
    sortMode?: SortMode;
    matchMode?: MatchMode;
    maxResults?: number;
}

interface AutoCompleteState {
    /** All parsed entries */
    entries: AutoCompleteEntry[];
    /** Entries indexed by first character for optimized lookup */
    entriesByFirstChar: Record<string, AutoCompleteEntry[]>;
    /** Whether data has been loaded */
    isLoaded: boolean;
    /** Whether to use optimized first-char lookup */
    useOptimizedLookup: boolean;

    /** Load and parse autocompletions from backend data */
    loadAutocompletions: (data: string[] | null) => void;

    /** Search for matching entries */
    search: (query: string, options?: SearchOptions) => AutoCompleteEntry[];

    /** Clear all data */
    clear: () => void;
}

/**
 * Format large numbers for display (e.g., 1234567 -> "1.2M")
 */
function formatCount(count: number): string {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
}

/**
 * Parse a single backend autocompletion entry.
 * Format: "DisplayName\nlowercase_clean\ntag_type\ncount\nalternatives"
 */
function parseEntry(raw: string): AutoCompleteEntry {
    const parts = raw.split('\n');
    const name = parts[0] || '';
    const clean = parts[1] || name;
    const low = clean.replace(/ /g, '_').toLowerCase();
    const tag = parts.length > 2 ? parseInt(parts[2], 10) || 0 : 0;
    const count = parts.length > 3 ? parseInt(parts[3], 10) || 0 : 0;
    const alts = parts.length > 4
        ? parts[4].split(',').map(a => a.trim().toLowerCase()).filter(Boolean)
        : [];

    return {
        name,
        low,
        clean,
        raw,
        count,
        countDisplay: count > 0 ? formatCount(count) : '',
        tag,
        alts,
    };
}

/**
 * Sort entries based on the selected mode.
 */
function sortEntries(entries: AutoCompleteEntry[], mode: SortMode): AutoCompleteEntry[] {
    if (mode === 'None') return entries;

    return [...entries].sort((a, b) => {
        switch (mode) {
            case 'Active':
                // Shorter names first, then alphabetical
                return a.low.length - b.low.length || a.low.localeCompare(b.low);
            case 'Alphabetical':
                return a.low.localeCompare(b.low);
            case 'Frequency':
                return b.count - a.count;
            default:
                return 0;
        }
    });
}

export const useAutoCompleteStore = create<AutoCompleteState>((set, get) => ({
    entries: [],
    entriesByFirstChar: {},
    isLoaded: false,
    useOptimizedLookup: false,

    loadAutocompletions: (data: string[] | null) => {
        if (!data || data.length === 0) {
            set({ entries: [], entriesByFirstChar: {}, isLoaded: false });
            return;
        }

        console.debug(`[AutoComplete] Loading ${data.length} entries...`);
        const startTime = performance.now();

        const entries: AutoCompleteEntry[] = [];
        const byFirstChar: Record<string, AutoCompleteEntry[]> = {};

        for (const raw of data) {
            const entry = parseEntry(raw);
            entries.push(entry);

            // Index by first character for optimized lookup
            const firstChar = entry.low[0];
            if (firstChar) {
                if (!byFirstChar[firstChar]) {
                    byFirstChar[firstChar] = [];
                }
                byFirstChar[firstChar].push(entry);

                // Also index by first char of alternatives
                for (const alt of entry.alts) {
                    const altFirstChar = alt[0];
                    if (altFirstChar && altFirstChar !== firstChar) {
                        if (!byFirstChar[altFirstChar]) {
                            byFirstChar[altFirstChar] = [];
                        }
                        byFirstChar[altFirstChar].push(entry);
                    }
                }
            }
        }

        const elapsed = performance.now() - startTime;
        console.debug(`[AutoComplete] Loaded ${entries.length} entries in ${elapsed.toFixed(1)}ms`);

        // Use optimized lookup for large datasets
        const useOptimized = entries.length > 10000;

        set({
            entries,
            entriesByFirstChar: byFirstChar,
            isLoaded: true,
            useOptimizedLookup: useOptimized,
        });
    },

    search: (query: string, options: SearchOptions = {}) => {
        const {
            sortMode = 'Active',
            matchMode = 'Bucketed',
            maxResults = 50,
        } = options;

        const state = get();
        if (!state.isLoaded || query.length < 2) {
            return [];
        }

        const queryLow = query.toLowerCase();
        const firstChar = queryLow[0];

        // Get the set of entries to search
        const searchSet = state.useOptimizedLookup && state.entriesByFirstChar[firstChar]
            ? state.entriesByFirstChar[firstChar]
            : state.entries;

        // Find matches
        const startWithList: AutoCompleteEntry[] = [];
        const startWithAltList: AutoCompleteEntry[] = [];
        const containsList: AutoCompleteEntry[] = [];

        for (const entry of searchSet) {
            const matchesMain = entry.low.includes(queryLow);
            const matchesAlt = entry.alts.some(alt => alt.includes(queryLow));

            if (matchesMain || matchesAlt) {
                if (entry.low.startsWith(queryLow)) {
                    startWithList.push(entry);
                } else if (entry.alts.some(alt => alt.startsWith(queryLow))) {
                    startWithAltList.push(entry);
                } else {
                    containsList.push(entry);
                }
            }
        }

        // Apply match mode filter
        let result: AutoCompleteEntry[];
        switch (matchMode) {
            case 'Bucketed':
                // Sort each bucket, then concatenate
                result = [
                    ...sortEntries(startWithList, sortMode),
                    ...sortEntries(startWithAltList, sortMode),
                    ...sortEntries(containsList, sortMode),
                ];
                break;
            case 'StartsWith':
                result = sortEntries([...startWithList, ...startWithAltList], sortMode);
                break;
            case 'Contains':
                result = sortEntries([...startWithList, ...startWithAltList, ...containsList], sortMode);
                break;
            default:
                result = [];
        }

        // Limit results
        if (result.length > maxResults) {
            result = result.slice(0, maxResults);
        }

        return result;
    },

    clear: () => {
        set({
            entries: [],
            entriesByFirstChar: {},
            isLoaded: false,
            useOptimizedLookup: false,
        });
    },
}));
