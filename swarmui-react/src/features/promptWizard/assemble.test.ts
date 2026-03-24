import { describe, expect, it } from 'vitest';
import { assemblePrompt } from './assemble';
import type { PromptTag, PromptProfile } from './types';

const illustrious: PromptProfile = {
  id: 'illustrious',
  name: 'Illustrious',
  stepOrder: ['quality', 'subject', 'appearance', 'action', 'setting', 'style', 'atmosphere'],
  tagSeparator: ', ',
};

function makeTag(overrides: Partial<PromptTag> & Pick<PromptTag, 'id' | 'text' | 'step'>): PromptTag {
  return { profiles: ['illustrious'], ...overrides };
}

describe('assemblePrompt', () => {
  it('orders tags by profile stepOrder', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'anime style', step: 'style' }),
      makeTag({ id: 't2', text: 'masterpiece', step: 'quality' }),
      makeTag({ id: 't3', text: '1girl', step: 'subject' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    expect(result.positive).toBe('masterpiece, 1girl, anime style');
  });

  it('orders within step by subcategory then selection order', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'blue eyes', step: 'appearance', subcategory: 'Eyes' }),
      makeTag({ id: 't2', text: 'long hair', step: 'appearance', subcategory: 'Hair' }),
      makeTag({ id: 't3', text: 'red dress', step: 'appearance', subcategory: 'Clothing' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    // Hair comes before Eyes in STEP_META.appearance.subcategories
    expect(result.positive).toBe('long hair, blue eyes, red dress');
  });

  it('places uncategorised tags before subcategorised ones', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'blue eyes', step: 'appearance', subcategory: 'Eyes' }),
      makeTag({ id: 't2', text: 'beautiful', step: 'appearance' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    expect(result.positive).toBe('beautiful, blue eyes');
  });

  it('collects negative text separately', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'masterpiece', step: 'quality', negativeText: 'worst quality' }),
      makeTag({ id: 't2', text: '1girl', step: 'subject' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    expect(result.positive).toBe('masterpiece, 1girl');
    expect(result.negative).toBe('worst quality');
  });

  it('returns empty strings when no tags selected', () => {
    const result = assemblePrompt([], illustrious);
    expect(result.positive).toBe('');
    expect(result.negative).toBe('');
  });

  it('deduplicates negative text from multiple tags', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'anime style', step: 'style', negativeText: 'realistic' }),
      makeTag({ id: 't2', text: 'anime art', step: 'style', negativeText: 'realistic' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    expect(result.negative).toBe('realistic');
  });
});
