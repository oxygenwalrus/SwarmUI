import { memo, useCallback } from 'react';
import { Group, UnstyledButton } from '@mantine/core';
import { IconMinus, IconPlus, IconSparkles, IconAlertTriangle } from '@tabler/icons-react';
import { SwarmBadge } from './ui';

interface PromptWizardTagChipProps {
  text: string;
  selected: boolean;
  weight?: number;
  isConflict?: boolean;
  isPairing?: boolean;
  onToggle: () => void;
  onWeightChange?: (weight: number) => void;
}

export const PromptWizardTagChip = memo(function PromptWizardTagChip({
  text,
  selected,
  weight = 1.0,
  isConflict,
  isPairing,
  onToggle,
  onWeightChange,
}: PromptWizardTagChipProps) {
  
  const handleIncrease = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWeightChange) onWeightChange(Math.round((weight + 0.1) * 10) / 10);
  }, [weight, onWeightChange]);

  const handleDecrease = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onWeightChange && weight > 0.1) onWeightChange(Math.round((weight - 0.1) * 10) / 10);
  }, [weight, onWeightChange]);

  // Determine styling based on conflict / pairing
  let tone: any = selected ? 'primary' : 'secondary';
  let emphasis: any = selected ? 'solid' : 'transparent';
  let style: any = { cursor: 'pointer', userSelect: 'none', fontSize: '0.90rem', paddingInline: selected ? 8 : 14, paddingBlock: 4 };

  if (!selected && isConflict) {
    tone = 'danger';
    emphasis = 'soft';
    style.opacity = 0.6;
    style.textDecoration = 'line-through';
  } else if (!selected && isPairing) {
    tone = 'warning';
    emphasis = 'light';
    style.border = '1px solid var(--mantine-color-warning-light)';
  }

  return (
    <SwarmBadge
      tone={tone}
      emphasis={emphasis}
      size="lg"
      style={style}
      onClick={onToggle}
      title={isConflict ? 'Conflicts with current selection' : isPairing ? 'Suggested pairing!' : ''}
    >
      <Group gap={6} wrap="nowrap" align="center">
        {!selected && isPairing && <IconSparkles size={12} />}
        {!selected && isConflict && <IconAlertTriangle size={12} />}
        
        <span>{text}</span>
        
        {selected && onWeightChange && (
          <Group gap={2} wrap="nowrap" align="center" style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 12, padding: '2px 4px' }}>
            <UnstyledButton onClick={handleDecrease} style={{ display: 'flex', opacity: 0.7 }}>
              <IconMinus size={12} />
            </UnstyledButton>
            <span style={{ fontSize: '0.8rem', minWidth: '1.2rem', textAlign: 'center', fontWeight: 'bold' }}>{weight.toFixed(1)}</span>
            <UnstyledButton onClick={handleIncrease} style={{ display: 'flex', opacity: 0.7 }}>
              <IconPlus size={12} />
            </UnstyledButton>
          </Group>
        )}
      </Group>
    </SwarmBadge>
  );
});
