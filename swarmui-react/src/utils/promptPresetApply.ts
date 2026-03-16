export function prependPromptText(currentValue: string | undefined, nextText: string): string {
    const trimmedCurrent = currentValue?.trim() ?? '';
    const trimmedNext = nextText.trim();

    if (!trimmedNext) {
        return trimmedCurrent;
    }

    return trimmedCurrent ? `${trimmedNext}, ${trimmedCurrent}` : trimmedNext;
}
