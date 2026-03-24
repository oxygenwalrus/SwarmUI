import { memo } from 'react';
import { PromptWizard } from './PromptWizard';

interface PromptPresetSelectorProps {
  onApplyToPrompt?: (text: string) => void;
  onApplyToNegative?: (text: string) => void;
  compact?: boolean;
}

/**
 * Backward-compatible entry point that now renders the newer prompt wizard.
 */
export const PromptPresetSelector = memo(function PromptPresetSelector(props: PromptPresetSelectorProps) {
  return <PromptWizard {...props} />;
});
