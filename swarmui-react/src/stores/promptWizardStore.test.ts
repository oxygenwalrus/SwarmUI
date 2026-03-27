import { describe, expect, it, beforeEach } from 'vitest';
import { usePromptWizardStore } from './promptWizardStore';

function resetStore() {
  usePromptWizardStore.setState({
    selectedTagIds: [],
    tagWeights: {},
    userBrowserPresets: [],
    activeView: 'steps',
    activePresetCategory: 'characters',
    presetSearchQuery: '',
  });
}

describe('promptWizardStore — browser presets', () => {
  beforeEach(() => resetStore());

  it('defaults activeView to steps', () => {
    expect(usePromptWizardStore.getState().activeView).toBe('steps');
  });

  it('defaults activePresetCategory to characters', () => {
    expect(usePromptWizardStore.getState().activePresetCategory).toBe('characters');
  });

  it('setActiveView switches view', () => {
    usePromptWizardStore.getState().setActiveView('presets');
    expect(usePromptWizardStore.getState().activeView).toBe('presets');
  });

  it('setActivePresetCategory switches category', () => {
    usePromptWizardStore.getState().setActivePresetCategory('scenes');
    expect(usePromptWizardStore.getState().activePresetCategory).toBe('scenes');
  });

  it('resetPresetBrowserEphemeral resets view and search', () => {
    const store = usePromptWizardStore.getState();
    store.setActiveView('presets');
    store.setPresetSearchQuery('test');
    usePromptWizardStore.getState().resetPresetBrowserEphemeral();
    const state = usePromptWizardStore.getState();
    expect(state.activeView).toBe('steps');
    expect(state.presetSearchQuery).toBe('');
  });

  it('applyBrowserPreset additively merges tag IDs', () => {
    usePromptWizardStore.setState({ selectedTagIds: ['tag-a', 'tag-b'] });
    usePromptWizardStore.getState().applyBrowserPreset(['tag-b', 'tag-c', 'tag-d']);
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual(['tag-a', 'tag-b', 'tag-c', 'tag-d']);
  });

  it('applyBrowserPreset deduplicates against existing tags', () => {
    usePromptWizardStore.setState({ selectedTagIds: ['tag-a'] });
    usePromptWizardStore.getState().applyBrowserPreset(['tag-a', 'tag-b']);
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual(['tag-a', 'tag-b']);
  });

  it('applyBrowserPreset deduplicates within incoming tags', () => {
    usePromptWizardStore.setState({ selectedTagIds: [] });
    usePromptWizardStore.getState().applyBrowserPreset(['tag-x', 'tag-x', 'tag-y']);
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual(['tag-x', 'tag-y']);
  });

  it('addBrowserPreset creates preset with generated id and isDefault false', () => {
    usePromptWizardStore.getState().addBrowserPreset({
      name: 'Test Preset',
      category: 'characters',
      tagIds: ['tag-a', 'tag-b'],
    });
    const presets = usePromptWizardStore.getState().userBrowserPresets;
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('Test Preset');
    expect(presets[0].isDefault).toBe(false);
    expect(presets[0].id).toMatch(/^browser-preset-/);
  });

  it('updateBrowserPreset modifies only matching preset', () => {
    usePromptWizardStore.getState().addBrowserPreset({ name: 'A', category: 'characters', tagIds: ['tag-a'] });
    usePromptWizardStore.getState().addBrowserPreset({ name: 'B', category: 'scenes', tagIds: ['tag-b'] });
    const presetA = usePromptWizardStore.getState().userBrowserPresets[0];
    usePromptWizardStore.getState().updateBrowserPreset(presetA.id, { name: 'A Updated' });
    const presets = usePromptWizardStore.getState().userBrowserPresets;
    expect(presets[0].name).toBe('A Updated');
    expect(presets[1].name).toBe('B');
  });

  it('removeBrowserPreset removes the preset', () => {
    usePromptWizardStore.getState().addBrowserPreset({ name: 'Temp', category: 'styles', tagIds: ['tag-x'] });
    const id = usePromptWizardStore.getState().userBrowserPresets[0].id;
    usePromptWizardStore.getState().removeBrowserPreset(id);
    expect(usePromptWizardStore.getState().userBrowserPresets).toHaveLength(0);
  });
});
