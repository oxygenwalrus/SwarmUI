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
      size="lg"
      style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.95rem', paddingInline: 14, paddingBlock: 8 }}
      onClick={onToggle}
    >
      {text}
    </SwarmBadge>
  );
});
