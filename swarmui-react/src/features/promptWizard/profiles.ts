import type { PromptProfile } from './types';

export const DEFAULT_PROFILE_ID = 'illustrious';

export const PROFILES: PromptProfile[] = [
  {
    id: 'illustrious',
    name: 'Illustrious / Danbooru',
    stepOrder: ['quality', 'subject', 'appearance', 'action', 'setting', 'style', 'atmosphere'],
    tagSeparator: ', ',
    description: 'Danbooru-style tag ordering. Quality tags first, then subject and details.',
  },
];

export function getProfile(id: string): PromptProfile | undefined {
  return PROFILES.find((p) => p.id === id);
}
