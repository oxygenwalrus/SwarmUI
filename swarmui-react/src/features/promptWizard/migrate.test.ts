import { describe, expect, it } from 'vitest';
import { migrateCustomPreset } from './migrate';

describe('migrateCustomPreset', () => {
  it('splits a custom preset into individual tags and a preset reference', () => {
    const result = migrateCustomPreset({
      id: 'custom-123',
      name: 'Noir Portrait',
      category: 'style',
      promptText: 'noir portrait, dramatic contrast',
      negativePromptText: 'flat lighting',
      isDefault: false,
    });

    expect(result.tags).toHaveLength(2);
    expect(result.tags[0].text).toBe('noir portrait');
    expect(result.tags[0].step).toBe('style');
    expect(result.tags[0].isCustom).toBe(true);
    expect(result.tags[1].text).toBe('dramatic contrast');

    expect(result.preset.name).toBe('Noir Portrait');
    expect(result.preset.tagIds).toEqual(result.tags.map((t) => t.id));
    expect(result.preset.isDefault).toBe(false);
  });

  it('assigns negativeText to the first tag', () => {
    const result = migrateCustomPreset({
      id: 'custom-456',
      name: 'Test',
      category: 'lighting',
      promptText: 'warm light, golden hour',
      negativePromptText: 'cold, blue',
      isDefault: false,
    });

    expect(result.tags[0].negativeText).toBe('cold, blue');
    expect(result.tags[1].negativeText).toBeUndefined();
  });

  it('maps old categories to correct steps', () => {
    const result = migrateCustomPreset({
      id: 'custom-789',
      name: 'Test',
      category: 'pose',
      promptText: 'standing',
      isDefault: false,
    });

    expect(result.tags[0].step).toBe('action');
  });
});
