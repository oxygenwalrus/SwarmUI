import type { PromptTag } from './types';

const RELATED_TEXTS: Record<string, string[]> = {
  princess: ['royal gown', 'tiara', 'gold crown'],
  knight: ['sword and shield', 'medieval fortress', 'heavy plate armor'],
  paladin: ['holy symbol', 'cathedral interior', 'divine'],
  dragon: ['fire breathing', 'volcanic landscape', 'ominous'],
  succubus: ['seductive charm', 'private glamour setting', 'lingerie'],
  'night city': ['city lights', 'shibuya', 'neon code'],
  camera: ['photographer', 'face close-up', 'film noir'],
  futuristic: ['high tech equipment', 'space station interior', 'holographic display'],
  boudoir: ['lingerie', 'private bedroom mood', 'intimate glow'],
};

const CONFLICT_TEXTS: Record<string, string[]> = {
  realistic: ['anime art', 'anime style'],
  photorealistic: ['anime art', 'anime style'],
  anime: ['photorealistic', 'realistic'],
  nsfw: ['adult content'],
};

function normalizeKey(text: string): string {
  return text.trim().toLowerCase();
}

function findIdsByText(tags: PromptTag[], values: string[]): string[] {
  const wanted = new Set(values.map(normalizeKey));
  return tags
    .filter((tag) => wanted.has(normalizeKey(tag.text)))
    .map((tag) => tag.id);
}

export function annotatePromptTags(tags: PromptTag[]): PromptTag[] {
  const idByText = new Map(tags.map((tag) => [normalizeKey(tag.text), tag.id]));

  return tags.map((tag) => {
    const key = normalizeKey(tag.text);
    const relatedIds = (RELATED_TEXTS[key] ?? [])
      .map((value) => idByText.get(normalizeKey(value)))
      .filter(Boolean) as string[];
    const conflictIds = (CONFLICT_TEXTS[key] ?? [])
      .map((value) => idByText.get(normalizeKey(value)))
      .filter(Boolean) as string[];

    const pairingIds = tag.negativeText
      ? findIdsByText(tags, [tag.negativeText])
      : [];

    return {
      ...tag,
      relatedTagIds: relatedIds.length > 0 ? relatedIds : tag.relatedTagIds,
      conflictTagIds: conflictIds.length > 0 ? conflictIds : tag.conflictTagIds,
      pairingTagIds: pairingIds.length > 0 ? pairingIds : tag.pairingTagIds,
    };
  });
}
