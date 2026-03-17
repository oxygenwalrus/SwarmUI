/**
 * Utility functions for creating deduplicated select options
 */

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

/**
 * Creates a deduplicated array of select options from a list of items.
 * Deduplication is case-insensitive based on the value field.
 * 
 * @param items - Array of items to convert to options
 * @param getKey - Function to extract the key/value from each item
 * @param getLabel - Function to extract the display label from each item
 * @param baseOptions - Optional array of base options to include first (e.g., 'Automatic', 'None')
 * @returns Deduplicated array of SelectOption objects
 */
export function createUniqueOptions<T>(
    items: T[],
    getKey: (item: T) => string | undefined,
    getLabel: (item: T) => string,
    baseOptions: SelectOption[] = []
): SelectOption[] {
    const seen = new Map<string, SelectOption>();

    // Add base options first (they take priority)
    for (const opt of baseOptions) {
        if (opt.value) {
            seen.set(opt.value.toLowerCase(), opt);
        }
    }

    // Add items, skipping duplicates
    for (const item of items) {
        const key = getKey(item);
        if (!key) continue;

        const normalizedKey = key.trim().toLowerCase();
        if (!seen.has(normalizedKey)) {
            seen.set(normalizedKey, {
                value: key.trim(),
                label: getLabel(item) || key,
            });
        }
    }

    return Array.from(seen.values());
}

/**
 * Creates model options with loaded/disabled state
 */
export function createModelOptions<T extends { name: string; title?: string; loaded?: boolean }>(
    models: T[]
): SelectOption[] {
    return models.map(model => ({
        value: model.name,
        label: model.title || model.name,
        disabled: !model.loaded,
    }));
}
