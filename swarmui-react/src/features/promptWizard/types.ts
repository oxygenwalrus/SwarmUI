export type BuilderStep =
  | 'subject'
  | 'appearance'
  | 'action'
  | 'setting'
  | 'style'
  | 'atmosphere'
  | 'quality';

export interface StepMeta {
  step: BuilderStep;
  label: string;
  description: string;
  subcategories: string[];
}

export interface PromptProfile {
  id: string;
  name: string;
  stepOrder: BuilderStep[];
  tagSeparator: string;
  description?: string;
}
