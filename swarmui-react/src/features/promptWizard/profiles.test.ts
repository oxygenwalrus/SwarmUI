import { describe, expect, it } from 'vitest';
import { PROFILES, getProfile, DEFAULT_PROFILE_ID } from './profiles';
import type { BuilderStep } from './types';

const ALL_STEPS: BuilderStep[] = [
  'subject', 'appearance', 'action', 'setting', 'style', 'atmosphere', 'quality',
];

describe('profiles', () => {
  it('exports at least one profile', () => {
    expect(PROFILES.length).toBeGreaterThan(0);
  });

  it('default profile covers all 7 steps exactly once', () => {
    const profile = getProfile(DEFAULT_PROFILE_ID);
    expect(profile).toBeDefined();
    expect([...profile!.stepOrder].sort()).toEqual([...ALL_STEPS].sort());
    expect(new Set(profile!.stepOrder).size).toBe(ALL_STEPS.length);
  });

  it('illustrious profile puts quality first', () => {
    const profile = getProfile('illustrious');
    expect(profile).toBeDefined();
    expect(profile!.stepOrder[0]).toBe('quality');
  });

  it('getProfile returns undefined for unknown id', () => {
    expect(getProfile('nonexistent')).toBeUndefined();
  });
});
