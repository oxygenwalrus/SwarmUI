import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { BuilderStep, PromptTag, PromptPreset } from '../features/promptWizard/types';
import { DEFAULT_PROFILE_ID } from '../features/promptWizard/profiles';

interface PromptWizardStore {
  // State
  selectedTagIds: string[];
  activeProfileId: string;
  activeStep: BuilderStep;
  customTags: PromptTag[];
  customPresets: PromptPreset[];
  migrationVersion: number;

  // Tag selection
  toggleTag: (tagId: string) => void;
  selectTag: (tagId: string) => void;
  deselectTag: (tagId: string) => void;
  clearSelections: () => void;

  // Quick-fill presets
  applyPreset: (tagIds: string[]) => void;

  // Navigation
  setActiveStep: (step: BuilderStep) => void;
  setActiveProfile: (profileId: string) => void;

  // Custom tags
  addCustomTag: (tag: { text: string; step: BuilderStep; subcategory?: string }) => void;
  removeCustomTag: (tagId: string) => void;

  // Custom presets
  addCustomPreset: (preset: Omit<PromptPreset, 'id' | 'isDefault'>) => void;
  removeCustomPreset: (presetId: string) => void;

  // Migration
  setMigrationVersion: (version: number) => void;
}

export const usePromptWizardStore = create<PromptWizardStore>()(
  devtools(
    persist(
      (set) => ({
        selectedTagIds: [],
        activeProfileId: DEFAULT_PROFILE_ID,
        activeStep: 'subject',
        customTags: [],
        customPresets: [],
        migrationVersion: 0,

        toggleTag: (tagId) => {
          set((state) => ({
            selectedTagIds: state.selectedTagIds.includes(tagId)
              ? state.selectedTagIds.filter((id) => id !== tagId)
              : [...state.selectedTagIds, tagId],
          }));
        },

        selectTag: (tagId) => {
          set((state) => ({
            selectedTagIds: state.selectedTagIds.includes(tagId)
              ? state.selectedTagIds
              : [...state.selectedTagIds, tagId],
          }));
        },

        deselectTag: (tagId) => {
          set((state) => ({
            selectedTagIds: state.selectedTagIds.filter((id) => id !== tagId),
          }));
        },

        clearSelections: () => {
          set({ selectedTagIds: [] });
        },

        applyPreset: (tagIds) => {
          set((state) => {
            const existing = new Set(state.selectedTagIds);
            const newIds = tagIds.filter((id) => !existing.has(id));
            return { selectedTagIds: [...state.selectedTagIds, ...newIds] };
          });
        },

        setActiveStep: (step) => {
          set({ activeStep: step });
        },

        setActiveProfile: (profileId) => {
          set({ activeProfileId: profileId });
        },

        addCustomTag: ({ text, step, subcategory }) => {
          const id = `custom-tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const tag: PromptTag = {
            id,
            text,
            step,
            subcategory,
            profiles: ['illustrious'],
            isCustom: true,
          };
          set((state) => ({ customTags: [...state.customTags, tag] }));
        },

        removeCustomTag: (tagId) => {
          set((state) => ({
            customTags: state.customTags.filter((t) => t.id !== tagId),
            selectedTagIds: state.selectedTagIds.filter((id) => id !== tagId),
          }));
        },

        addCustomPreset: (preset) => {
          const id = `custom-preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          set((state) => ({
            customPresets: [...state.customPresets, { ...preset, id, isDefault: false }],
          }));
        },

        removeCustomPreset: (presetId) => {
          set((state) => ({
            customPresets: state.customPresets.filter((p) => p.id !== presetId),
          }));
        },

        setMigrationVersion: (version) => {
          set({ migrationVersion: version });
        },
      }),
      {
        name: 'swarmui-prompt-wizard-v1',
        partialize: (state) => ({
          selectedTagIds: state.selectedTagIds,
          activeProfileId: state.activeProfileId,
          customTags: state.customTags,
          customPresets: state.customPresets,
          migrationVersion: state.migrationVersion,
        }),
      }
    ),
    { name: 'PromptWizardStore' }
  )
);
