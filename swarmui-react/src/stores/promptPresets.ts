import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export interface PromptPreset {
    id: string;
    name: string;
    category: PresetCategory;
    promptText: string;
    negativePromptText?: string;
    isDefault?: boolean;
}

export type PresetCategory =
    | 'style'
    | 'pose'
    | 'perspective'
    | 'lighting'
    | 'quality'
    | 'mood'
    | 'location'
    | 'character'
    | 'demographics'
    | 'details'
    | 'object'
    | 'nsfw'
    | 'nsfw_anatomy'
    | 'nsfw_pose'
    | 'nsfw_act'
    | 'nsfw_clothing';

interface PromptPresetsStore {
    presets: PromptPreset[];
    selectedPresetIds: string[];
    hasLoadedDefaults: boolean;
    isLoadingDefaults: boolean;
    ensureDefaultsLoaded: () => Promise<void>;
    togglePreset: (id: string) => void;
    selectPreset: (id: string) => void;
    deselectPreset: (id: string) => void;
    clearSelections: () => void;
    addCustomPreset: (preset: Omit<PromptPreset, 'id'>) => void;
    removePreset: (id: string) => void;
    getSelectedPresets: () => PromptPreset[];
    getCombinedPrompt: () => string;
    getCombinedNegativePrompt: () => string;
    getPresetsByCategory: (category: PresetCategory) => PromptPreset[];
}

let defaultPresetsPromise: Promise<PromptPreset[]> | null = null;

function loadDefaultPresets(): Promise<PromptPreset[]> {
    if (!defaultPresetsPromise) {
        defaultPresetsPromise = import('../data/promptPresets.json').then((module) => module.default as PromptPreset[]);
    }
    return defaultPresetsPromise;
}

function getCustomPresets(presets: PromptPreset[]): PromptPreset[] {
    return presets.filter((preset) => !preset.isDefault);
}

function filterSelectedIds(presets: PromptPreset[], selectedPresetIds: string[]): string[] {
    const validIds = new Set(presets.map((preset) => preset.id));
    return selectedPresetIds.filter((id) => validIds.has(id));
}

export const usePromptPresetsStore = create<PromptPresetsStore>()(
    devtools(
        persist(
            (set, get) => ({
                presets: [],
                selectedPresetIds: [],
                hasLoadedDefaults: false,
                isLoadingDefaults: false,

                ensureDefaultsLoaded: async () => {
                    if (get().hasLoadedDefaults || get().isLoadingDefaults) {
                        return;
                    }

                    set({ isLoadingDefaults: true });

                    try {
                        const defaults = await loadDefaultPresets();
                        set((state) => {
                            const presets = [...defaults, ...getCustomPresets(state.presets)];
                            return {
                                presets,
                                selectedPresetIds: filterSelectedIds(presets, state.selectedPresetIds),
                                hasLoadedDefaults: true,
                                isLoadingDefaults: false,
                            };
                        });
                    } catch (error) {
                        set({ isLoadingDefaults: false });
                        throw error;
                    }
                },

                togglePreset: (id: string) => {
                    set((state) => ({
                        selectedPresetIds: state.selectedPresetIds.includes(id)
                            ? state.selectedPresetIds.filter(pid => pid !== id)
                            : [...state.selectedPresetIds, id]
                    }));
                },

                selectPreset: (id: string) => {
                    set((state) => ({
                        selectedPresetIds: state.selectedPresetIds.includes(id)
                            ? state.selectedPresetIds
                            : [...state.selectedPresetIds, id]
                    }));
                },

                deselectPreset: (id: string) => {
                    set((state) => ({
                        selectedPresetIds: state.selectedPresetIds.filter(pid => pid !== id)
                    }));
                },

                clearSelections: () => {
                    set({ selectedPresetIds: [] });
                },

                addCustomPreset: (preset) => {
                    const newPreset: PromptPreset = {
                        ...preset,
                        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    };
                    set((state) => ({
                        presets: [...state.presets, newPreset]
                    }));
                },

                removePreset: (id: string) => {
                    // Only remove non-default presets
                    const preset = get().presets.find(p => p.id === id);
                    if (preset?.isDefault) return;

                    set((state) => ({
                        presets: state.presets.filter(p => p.id !== id),
                        selectedPresetIds: state.selectedPresetIds.filter(pid => pid !== id)
                    }));
                },

                getSelectedPresets: () => {
                    const { presets, selectedPresetIds } = get();
                    return presets.filter(p => selectedPresetIds.includes(p.id));
                },

                getCombinedPrompt: () => {
                    const selectedPresets = get().getSelectedPresets();
                    return selectedPresets.map(p => p.promptText).join(', ');
                },

                getCombinedNegativePrompt: () => {
                    const selectedPresets = get().getSelectedPresets();
                    return selectedPresets
                        .filter(p => p.negativePromptText)
                        .map(p => p.negativePromptText)
                        .join(', ');
                },

                getPresetsByCategory: (category: PresetCategory) => {
                    return get().presets.filter(p => p.category === category);
                },
            }),
            {
                name: 'swarmui-prompt-presets-v2',
                partialize: (state) => ({
                    presets: getCustomPresets(state.presets),
                    selectedPresetIds: state.selectedPresetIds,
                }),
                merge: (persistedState: any, currentState: PromptPresetsStore) => {
                    const persistedPresets = getCustomPresets(persistedState.presets || []);
                    return {
                        ...currentState,
                        ...persistedState,
                        presets: persistedPresets,
                        selectedPresetIds: persistedState.selectedPresetIds || [],
                        hasLoadedDefaults: false,
                        isLoadingDefaults: false,
                    };
                }
            }
        ),
        { name: 'PromptPresetsStore' }
    )
);

// Category display names
export const CATEGORY_LABELS: Record<PresetCategory, string> = {
    style: 'Styles',
    pose: 'Poses',
    perspective: 'Perspectives',
    lighting: 'Lighting',
    quality: 'Quality',
    mood: 'Mood',
    location: 'Locations',
    character: 'Characters',
    demographics: 'Demographics',
    details: 'Details',
    object: 'Objects',
    nsfw: 'NSFW General',
    nsfw_anatomy: 'NSFW Anatomy',
    nsfw_pose: 'NSFW Poses',
    nsfw_act: 'NSFW Acts',
    nsfw_clothing: 'NSFW Clothing',
};

// Category order for display
export const CATEGORY_ORDER: PresetCategory[] = [
    'quality',
    'style',
    'character',
    'demographics',
    'details',
    'object',
    'pose',
    'perspective',
    'location',
    'lighting',
    'mood',
    'nsfw',
    'nsfw_anatomy',
    'nsfw_pose',
    'nsfw_act',
    'nsfw_clothing',
];
