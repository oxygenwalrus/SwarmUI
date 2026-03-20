export type BuilderStep =
  | 'subject'
  | 'appearance'
  | 'action'
  | 'setting'
  | 'style'
  | 'atmosphere'
  | 'quality';

export type WizardTone = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface StepMeta {
  step: BuilderStep;
  label: string;
  description: string;
  subcategories: string[];
  tone: WizardTone;
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
  majorGroup?: string;
  minorGroup?: string;
  groupOrder?: number;
  minorOrder?: number;
  profiles: string[];
  aliases?: string[];
  negativeText?: string;
  isCustom?: boolean;
}

export interface PromptPreset {
  id: string;
  name: string;
  step: BuilderStep;
  tagIds: string[];
  description?: string;
  isDefault: boolean;
}
