import { memo } from 'react';
import { SwarmBadge } from './ui';

interface PromptWizardTagChipProps {
  text: string;
  selected: boolean;
  onToggle: () => void;
}

export const PromptWizardTagChip = memo(function PromptWizardTagChip({
  text,
  selected,
  onToggle,
}: PromptWizardTagChipProps) {
  return (
    <SwarmBadge
      tone={selected ? 'primary' : 'secondary'}
      emphasis={selected ? 'solid' : 'soft'}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={onToggle}
    >
      {text}
    </SwarmBadge>
  );
});
