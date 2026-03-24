import type { BuilderStep, PromptTag, PromptPreset } from './types';

/** Shape of the old preset format from promptPresets store v2 */
export interface LegacyPreset {
  id: string;
  name: string;
  category: string;
  promptText: string;
  negativePromptText?: string;
  isDefault?: boolean;
}

const CATEGORY_TO_STEP: Record<string, BuilderStep> = {
  quality: 'quality',
  style: 'style',
  character: 'subject',
  demographics: 'appearance',
  details: 'appearance',
  object: 'subject',
  pose: 'action',
  perspective: 'setting',
  location: 'setting',
  lighting: 'atmosphere',
  mood: 'atmosphere',
  nsfw: 'subject',
  nsfw_anatomy: 'appearance',
  nsfw_pose: 'action',
  nsfw_act: 'action',
  nsfw_clothing: 'appearance',
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function migrateCustomPreset(legacy: LegacyPreset): {
  tags: PromptTag[];
  preset: PromptPreset;
} {
  const step = CATEGORY_TO_STEP[legacy.category] ?? 'style';
  const tokens = legacy.promptText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const tags: PromptTag[] = tokens.map((text, index) => ({
    id: `custom-tag-${slugify(legacy.name)}-${slugify(text)}-${index}`,
    text,
    step,
    profiles: ['illustrious'],
    isCustom: true,
    negativeText: index === 0 ? legacy.negativePromptText : undefined,
  }));

  const preset: PromptPreset = {
    id: `custom-preset-${slugify(legacy.name)}`,
    name: legacy.name,
    step,
    tagIds: tags.map((t) => t.id),
    isDefault: false,
  };

  return { tags, preset };
}

export const MIGRATION_VERSION = 1;
