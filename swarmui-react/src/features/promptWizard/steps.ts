// swarmui-react/src/features/promptWizard/steps.ts
import type { BuilderStep, StepMeta } from './types';

export const STEP_META: StepMeta[] = [
  {
    step: 'subject',
    label: 'Subject',
    description: 'What are you generating?',
    subcategories: ['Character', 'Creature', 'Object', 'Scene'],
  },
  {
    step: 'appearance',
    label: 'Appearance',
    description: 'How does the subject look?',
    subcategories: ['Hair', 'Eyes', 'Body', 'Clothing', 'Accessories'],
  },
  {
    step: 'action',
    label: 'Action & Pose',
    description: 'What is the subject doing?',
    subcategories: ['Pose', 'Expression', 'Gesture'],
  },
  {
    step: 'setting',
    label: 'Setting',
    description: 'Where is the scene?',
    subcategories: ['Indoor', 'Outdoor', 'Fantasy', 'Urban'],
  },
  {
    step: 'style',
    label: 'Style',
    description: 'What artistic style?',
    subcategories: ['Anime', 'Realistic', 'Painting', 'Digital'],
  },
  {
    step: 'atmosphere',
    label: 'Atmosphere',
    description: 'Mood, lighting, and color?',
    subcategories: ['Lighting', 'Mood', 'Color Palette'],
  },
  {
    step: 'quality',
    label: 'Quality',
    description: 'Technical quality and negative tags',
    subcategories: ['Positive Quality', 'Negative Quality'],
  },
];

export function getStepMeta(step: BuilderStep): StepMeta | undefined {
  return STEP_META.find((m) => m.step === step);
}
