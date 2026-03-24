import type { PromptTag, PromptProfile } from './types';
import { getStepMeta } from './steps';

export interface AssembleResult {
  positive: string;
  negative: string;
}

export function assemblePrompt(
  selectedTags: PromptTag[],
  profile: PromptProfile,
  tagWeights?: Record<string, number>,
): AssembleResult {
  if (selectedTags.length === 0) {
    return { positive: '', negative: '' };
  }

  const ordered: PromptTag[] = [];

  for (const step of profile.stepOrder) {
    const stepTags = selectedTags.filter((t) => t.step === step);
    const meta = getStepMeta(step);
    const subcatOrder = meta?.subcategories ?? [];

    // Uncategorised tags first (General group)
    const uncategorised = stepTags.filter((t) => !t.subcategory);
    ordered.push(...uncategorised);

    // Then by subcategory order
    for (const subcat of subcatOrder) {
      const subcatTags = stepTags.filter((t) => t.subcategory === subcat);
      ordered.push(...subcatTags);
    }

    // Any subcategory not in the meta list (shouldn't happen, but safe)
    const knownSubcats = new Set([undefined, ...subcatOrder]);
    const remaining = stepTags.filter((t) => t.subcategory && !knownSubcats.has(t.subcategory));
    ordered.push(...remaining);
  }

  const positive = ordered.map((t) => {
    const weight = tagWeights?.[t.id];
    if (weight !== undefined && weight !== 1.0) {
      return `(${t.text}:${weight.toFixed(1)})`;
    }
    return t.text;
  }).join(profile.tagSeparator);

  const negativeSet = new Set<string>();
  const negatives: string[] = [];
  for (const tag of ordered) {
    if (tag.negativeText) {
      const lower = tag.negativeText.toLowerCase();
      if (!negativeSet.has(lower)) {
        negativeSet.add(lower);
        negatives.push(tag.negativeText);
      }
    }
  }
  const negative = negatives.join(profile.tagSeparator);

  return { positive, negative };
}
