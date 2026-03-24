// swarmui-react/src/features/promptWizard/steps.ts
import type { BuilderStep, StepMeta } from './types';

export const STEP_META: StepMeta[] = [
  {
    step: 'subject',
    label: 'Subject',
    description: 'What are you generating?',
    subcategories: ['Character', 'Creature', 'Object', 'Scene', 'Theme', 'Explicit'],
    tone: 'info',
  },
  {
    step: 'appearance',
    label: 'Appearance',
    description: 'How does the subject look?',
    subcategories: ['Hair', 'Eyes', 'Face', 'Body', 'Clothing', 'Footwear', 'Accessories', 'Explicit'],
    tone: 'warning',
  },
  {
    step: 'action',
    label: 'Action & Pose',
    description: 'What is the subject doing?',
    subcategories: ['Framing', 'Pose', 'Motion', 'Gesture', 'Expression', 'Explicit'],
    tone: 'success',
  },
  {
    step: 'setting',
    label: 'Setting',
    description: 'Where is the scene?',
    subcategories: ['Camera', 'Indoor', 'Urban', 'Outdoor', 'Fantasy', 'Sci-Fi'],
    tone: 'primary',
  },
  {
    step: 'style',
    label: 'Style',
    description: 'What artistic style?',
    subcategories: ['Anime', 'Realistic', 'Painting', 'Digital', 'Cinematic', 'Reference', 'Graphic', 'Retro', 'Finish'],
    tone: 'danger',
  },
  {
    step: 'atmosphere',
    label: 'Atmosphere',
    description: 'Mood, lighting, and color?',
    subcategories: ['Lighting', 'Mood', 'Color Palette', 'Effects', 'Explicit'],
    tone: 'warning',
  },
  {
    step: 'quality',
    label: 'Quality',
    description: 'Technical quality and negative tags',
    subcategories: ['Positive Quality', 'Negative Quality', 'Cleanup'],
    tone: 'secondary',
  },
];

export function getStepMeta(step: BuilderStep): StepMeta | undefined {
  return STEP_META.find((m) => m.step === step);
}
