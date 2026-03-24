import { memo } from 'react';
import { PromptWizard } from './PromptWizard';

interface PromptPresetSelectorProps {
  onApplyToPrompt?: (text: string, mode?: 'replace' | 'append') => void;
  onApplyToNegative?: (text: string, mode?: 'replace' | 'append') => void;
  compact?: boolean;
}

/**
 * Backward-compatible entry point that now renders the newer prompt wizard.
 */
export const PromptPresetSelector = memo(function PromptPresetSelector(props: PromptPresetSelectorProps) {
  return <PromptWizard {...props} />;
});
