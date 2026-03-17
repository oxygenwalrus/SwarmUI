import { afterEach, describe, expect, it } from 'vitest';
import { usePromptPresetsStore } from './promptPresets';

const initialState = usePromptPresetsStore.getState();
const storage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
            storage.set(key, value);
        },
        removeItem: (key: string) => {
            storage.delete(key);
        },
        clear: () => {
            storage.clear();
        },
    },
    configurable: true,
});

afterEach(() => {
    usePromptPresetsStore.setState({
        ...initialState,
        presets: [...initialState.presets],
        selectedPresetIds: [],
    });
    globalThis.localStorage.removeItem('swarmui-prompt-presets-v2');
});

describe('promptPresets store', () => {
    it('combines selected preset prompt and negative text', () => {
        const store = usePromptPresetsStore.getState();

        store.selectPreset('style-anime');
        store.selectPreset('style-realistic');

        const nextState = usePromptPresetsStore.getState();
        expect(nextState.getSelectedPresets().map((preset) => preset.id)).toEqual([
            'style-anime',
            'style-realistic',
        ]);
        expect(nextState.getCombinedPrompt()).toContain('anime style');
        expect(nextState.getCombinedPrompt()).toContain('photorealistic');
        expect(nextState.getCombinedNegativePrompt()).toContain('realistic');
        expect(nextState.getCombinedNegativePrompt()).toContain('cartoon');
    });

    it('adds and removes custom presets while clearing stale selections', () => {
        const store = usePromptPresetsStore.getState();

        store.addCustomPreset({
            name: 'Noir Portrait',
            category: 'style',
            promptText: 'noir portrait, dramatic contrast',
            negativePromptText: 'flat lighting',
            isDefault: false,
        });

        const createdPreset = usePromptPresetsStore
            .getState()
            .presets.find((preset) => preset.name === 'Noir Portrait');

        expect(createdPreset).toBeDefined();
        expect(createdPreset?.isDefault).toBe(false);

        if (!createdPreset) {
            throw new Error('Expected created preset to exist');
        }

        store.selectPreset(createdPreset.id);
        expect(usePromptPresetsStore.getState().selectedPresetIds).toContain(createdPreset.id);

        store.removePreset(createdPreset.id);

        const nextState = usePromptPresetsStore.getState();
        expect(nextState.presets.some((preset) => preset.id === createdPreset.id)).toBe(false);
        expect(nextState.selectedPresetIds).not.toContain(createdPreset.id);
    });
});
