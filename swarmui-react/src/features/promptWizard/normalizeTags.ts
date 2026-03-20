import type { PromptTag } from './types';

function normalizeText(text: string): string {
  return text.toLowerCase();
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferSubjectCategory(tag: PromptTag, text: string): PromptTag {
  if (includesAny(text, ['nsfw', 'r-18', 'adult content'])) {
    return { ...tag, subcategory: 'Theme' };
  }
  if (includesAny(text, ['nude', 'naked', 'unclothed'])) {
    return { ...tag, step: 'appearance', subcategory: 'Body' };
  }
  if (includesAny(text, ['lingerie', 'apparel', 'fabric', 'clothing', 'robe', 'loungewear', 'attire', 'heels', 'stilettos', 'footwear', 'garter', 'shirt', 'fashion', 'intimates', 'body chain', 'jewelry', 'adornment'])) {
    const subcategory = includesAny(text, ['heels', 'stilettos', 'footwear']) ? 'Footwear' : includesAny(text, ['body chain', 'jewelry', 'adornment']) ? 'Accessories' : 'Clothing';
    return { ...tag, step: 'appearance', subcategory };
  }
  if (includesAny(text, ['flushed skin', 'oiled skin', 'glossy highlights', 'body sheen', 'curves', 'silhouette'])) {
    return { ...tag, step: 'appearance', subcategory: 'Body' };
  }
  if (includesAny(text, ['expression', 'gaze', 'eye contact', 'smile', 'eyes', 'glance'])) {
    return { ...tag, step: 'action', subcategory: 'Expression' };
  }
  if (includesAny(text, ['pose', 'posture', 'stance', 'body language', 'kneeling', 'reclining', 'lounging', 'over shoulder look', 'twist'])) {
    return { ...tag, step: 'action', subcategory: 'Pose' };
  }
  if (includesAny(text, ['dressing room', 'vanity', 'changing area', 'hotel suite', 'bedding', 'city lights', 'vip lounge', 'velvet seating', 'room', 'bubble bath', 'water', 'spa'])) {
    return { ...tag, step: 'setting', subcategory: includesAny(text, ['city lights', 'vip lounge']) ? 'Urban' : 'Indoor' };
  }
  if (includesAny(text, ['lighting', 'light', 'atmosphere', 'glow', 'steam'])) {
    return { ...tag, step: 'atmosphere', subcategory: 'Lighting' };
  }
  if (includesAny(text, ['romantic', 'sensual', 'chemistry', 'warmth', 'dominant vibe', 'commanding presence', 'energy', 'submissive vibe', 'shy sensuality', 'vulnerability', 'aftercare', 'comfort', 'affection', 'recovery'])) {
    return { ...tag, step: 'atmosphere', subcategory: 'Mood' };
  }
  return { ...tag, subcategory: 'Theme' };
}

function inferSettingCategory(tag: PromptTag, text: string): PromptTag {
  if (includesAny(text, ['shot', 'angle', 'view', 'perspective', 'pov', 'focus', 'lens', 'close-up', 'framing', 'diorama'])) {
    return { ...tag, subcategory: 'Camera' };
  }
  if (includesAny(text, ['city', 'metropolitan', 'shibuya', 'manhattan', 'paris', 'metro', 'underground'])) {
    return { ...tag, subcategory: 'Urban' };
  }
  if (includesAny(text, ['trees', 'woodland', 'nature', 'foliage', 'sand', 'waves', 'tropical', 'coastal', 'peaks', 'alpine', 'dunes', 'oasis', 'underwater', 'coral', 'flowers', 'plants', 'wildflowers', 'grass', 'spring', 'winter landscape', 'ice peaks'])) {
    return { ...tag, subcategory: 'Outdoor' };
  }
  if (includesAny(text, ['medieval', 'torii', 'sacred', 'mythical', 'atlantis', 'haunted', 'graveyard', 'palace', 'cathedral', 'holy', 'colosseum'])) {
    return { ...tag, subcategory: 'Fantasy' };
  }
  if (includesAny(text, ['science fiction', 'futuristic technology', 'high tech equipment', 'sterile', 'medical facility', 'white halls', 'viewport looking at earth', 'galaxy', 'stars', 'nebula', 'cosmic', 'astronomical'])) {
    return { ...tag, subcategory: 'Sci-Fi' };
  }
  return { ...tag, subcategory: 'Indoor' };
}

function inferStyleCategory(tag: PromptTag, text: string): PromptTag {
  if (includesAny(text, ['style', 'studio', 'madhouse', 'tite kubo', 'kishimoto', 'akira toriyama', 'warhol', 'monet'])) {
    return { ...tag, subcategory: 'Reference' };
  }
  if (includesAny(text, ['vector art', 'flat design', 'line art', 'clean linework', 'graphic', 'halftone', 'screentones', 'pop art'])) {
    return { ...tag, subcategory: 'Graphic' };
  }
  if (includesAny(text, ['old camera', 'sepia', '1920s', 'victorian', 'art deco', 'retro', 'gothic'])) {
    return { ...tag, subcategory: 'Retro' };
  }
  if (includesAny(text, ['dramatic', 'serene', 'fantasy', 'ninja', 'shinobi', 'martial arts', 'cute', 'stylized', 'ominous grandeur', 'gothic atmosphere'])) {
    return { ...tag, subcategory: 'Cinematic' };
  }
  return { ...tag, subcategory: 'Finish' };
}

function inferActionCategory(tag: PromptTag, text: string): PromptTag {
  if (includesAny(text, ['smile', 'cry', 'laugh', 'angry', 'blush', 'teasing', 'orgasm face', 'blank eyes'])) {
    return { ...tag, subcategory: 'Expression' };
  }
  if (includesAny(text, ['pov', 'view', 'angle', 'shot', 'close-up', 'profile view', 'back view', 'headshot', 'portrait', 'full body', 'upper body'])) {
    return { ...tag, subcategory: 'Framing' };
  }
  if (includesAny(text, ['walking', 'running', 'jumping', 'motion', 'movement', 'sprinting', 'airborne', 'dynamic'])) {
    return { ...tag, subcategory: 'Motion' };
  }
  if (includesAny(text, ['hand', 'touching', 'pointing', 'holding', 'crossed', 'gesture'])) {
    return { ...tag, subcategory: 'Gesture' };
  }
  return { ...tag, subcategory: 'Pose' };
}

function inferAppearanceCategory(tag: PromptTag, text: string): PromptTag {
  if (includesAny(text, ['shoe', 'heels', 'boots', 'sandals', 'footwear', 'stilettos'])) {
    return { ...tag, subcategory: 'Footwear' };
  }
  if (includesAny(text, ['face', 'lip', 'makeup', 'smile', 'gaze'])) {
    return { ...tag, subcategory: 'Face' };
  }
  return tag;
}

function inferAtmosphereCategory(tag: PromptTag, text: string): PromptTag {
  if (includesAny(text, ['color', 'palette', 'pink and blue', 'sepia', 'monochrome', 'gold accents'])) {
    return { ...tag, subcategory: 'Color Palette' };
  }
  if (includesAny(text, ['fog', 'smoke', 'steam', 'sparkle', 'glow', 'particles'])) {
    return { ...tag, subcategory: 'Effects' };
  }
  return tag;
}

function inferQualityCategory(tag: PromptTag, text: string): PromptTag {
  if (tag.negativeText?.trim() || includesAny(text, ['bad', 'worst', 'lowres', 'blurry', 'deformed', 'extra'])) {
    return { ...tag, subcategory: 'Negative Quality' };
  }
  return { ...tag, subcategory: tag.subcategory ?? 'Positive Quality' };
}

function normalizeTag(tag: PromptTag): PromptTag {
  const text = normalizeText(tag.text);

  if (tag.step === 'subject' && !tag.subcategory) {
    return inferSubjectCategory(tag, text);
  }
  if (tag.step === 'setting' && !tag.subcategory) {
    return inferSettingCategory(tag, text);
  }
  if (tag.step === 'style' && !tag.subcategory) {
    return inferStyleCategory(tag, text);
  }
  if (tag.step === 'action') {
    return inferActionCategory(tag, text);
  }
  if (tag.step === 'appearance') {
    return inferAppearanceCategory(tag, text);
  }
  if (tag.step === 'atmosphere') {
    return inferAtmosphereCategory(tag, text);
  }
  if (tag.step === 'quality') {
    return inferQualityCategory(tag, text);
  }

  return tag;
}

export function normalizePromptTags(tags: PromptTag[]): PromptTag[] {
  return tags.map((tag) => normalizeTag(tag));
}
