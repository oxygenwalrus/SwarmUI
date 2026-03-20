import { afterEach, describe, expect, it } from 'vitest';
import { usePromptWizardStore } from './promptWizardStore';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
  },
  configurable: true,
});

const initialState = usePromptWizardStore.getState();

afterEach(() => {
  usePromptWizardStore.setState({ ...initialState, selectedTagIds: [], customTags: [], customPresets: [] });
  storage.clear();
});

describe('promptWizardStore', () => {
  it('starts with no selected tags', () => {
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual([]);
  });

  it('toggles a tag on and off', () => {
    const store = usePromptWizardStore.getState();
    store.toggleTag('tag-style-anime-style');
    expect(usePromptWizardStore.getState().selectedTagIds).toContain('tag-style-anime-style');

    store.toggleTag('tag-style-anime-style');
    expect(usePromptWizardStore.getState().selectedTagIds).not.toContain('tag-style-anime-style');
  });

  it('applies a quick-fill preset by selecting all its tag IDs', () => {
    const store = usePromptWizardStore.getState();
    store.applyPreset(['tag-1', 'tag-2', 'tag-3']);
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual(['tag-1', 'tag-2', 'tag-3']);
  });

  it('does not duplicate tag IDs when applying preset over existing selection', () => {
    const store = usePromptWizardStore.getState();
    store.toggleTag('tag-1');
    store.applyPreset(['tag-1', 'tag-2']);
    const ids = usePromptWizardStore.getState().selectedTagIds;
    expect(ids.filter((id) => id === 'tag-1')).toHaveLength(1);
  });

  it('clears all selections', () => {
    const store = usePromptWizardStore.getState();
    store.toggleTag('tag-1');
    store.toggleTag('tag-2');
    store.clearSelections();
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual([]);
  });

  it('switches active profile', () => {
    const store = usePromptWizardStore.getState();
    expect(store.activeProfileId).toBe('illustrious');
    store.setActiveProfile('flux');
    expect(usePromptWizardStore.getState().activeProfileId).toBe('flux');
  });

  it('adds a custom tag', () => {
    const store = usePromptWizardStore.getState();
    store.addCustomTag({ text: 'my custom tag', step: 'style' });
    const customs = usePromptWizardStore.getState().customTags;
    expect(customs).toHaveLength(1);
    expect(customs[0].text).toBe('my custom tag');
    expect(customs[0].isCustom).toBe(true);
  });

  it('removes a custom tag and deselects it', () => {
    const store = usePromptWizardStore.getState();
    store.addCustomTag({ text: 'temp tag', step: 'quality' });
    const tagId = usePromptWizardStore.getState().customTags[0].id;
    store.toggleTag(tagId);
    expect(usePromptWizardStore.getState().selectedTagIds).toContain(tagId);

    store.removeCustomTag(tagId);
    expect(usePromptWizardStore.getState().customTags).toHaveLength(0);
    expect(usePromptWizardStore.getState().selectedTagIds).not.toContain(tagId);
  });
});
