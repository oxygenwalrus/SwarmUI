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

export interface PromptTag {
  id: string;
  text: string;
  step: BuilderStep;
  subcategory?: string;
  profiles: string[];
  isCustom?: boolean;
}

export interface PromptPreset {
  id: string;
  name: string;
  tagIds: string[];
  isDefault?: boolean;
}
