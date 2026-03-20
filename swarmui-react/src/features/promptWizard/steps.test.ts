// swarmui-react/src/features/promptWizard/steps.test.ts
import { describe, expect, it } from 'vitest';
import { STEP_META, getStepMeta } from './steps';
import type { BuilderStep } from './types';

const ALL_STEPS: BuilderStep[] = [
  'subject', 'appearance', 'action', 'setting', 'style', 'atmosphere', 'quality',
];

describe('steps', () => {
  it('defines metadata for every BuilderStep', () => {
    for (const step of ALL_STEPS) {
      const meta = getStepMeta(step);
      expect(meta, `missing StepMeta for "${step}"`).toBeDefined();
      expect(meta!.label.length).toBeGreaterThan(0);
      expect(meta!.description.length).toBeGreaterThan(0);
    }
  });

  it('appearance step has subcategories', () => {
    const meta = getStepMeta('appearance');
    expect(meta!.subcategories.length).toBeGreaterThan(0);
    expect(meta!.subcategories).toContain('Hair');
    expect(meta!.subcategories).toContain('Eyes');
  });

  it('STEP_META length matches number of BuilderSteps', () => {
    expect(STEP_META.length).toBe(ALL_STEPS.length);
  });
});
