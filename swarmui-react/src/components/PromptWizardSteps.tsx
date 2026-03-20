import { memo } from 'react';
import { Group, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import { SwarmBadge } from './ui';
import type { BuilderStep, StepMeta } from '../features/promptWizard/types';

interface PromptWizardStepsProps {
  steps: StepMeta[];
  activeStep: BuilderStep;
  tagCountsByStep: Record<BuilderStep, number>;
  onStepClick: (step: BuilderStep) => void;
}

export const PromptWizardSteps = memo(function PromptWizardSteps({
  steps,
  activeStep,
  tagCountsByStep,
  onStepClick,
}: PromptWizardStepsProps) {
  return (
    <ScrollArea offsetScrollbars>
      <Group gap="xs" wrap="nowrap" px="md" py="sm">
        {steps.map((meta, index) => {
          const isActive = meta.step === activeStep;
          const count = tagCountsByStep[meta.step] ?? 0;
          return (
            <UnstyledButton key={meta.step} onClick={() => onStepClick(meta.step)}>
              <Group
                gap={6}
                wrap="nowrap"
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--mantine-radius-md)',
                  background: isActive ? `color-mix(in srgb, var(--mantine-color-${meta.tone}-light) 75%, var(--elevation-raised))` : undefined,
                  border: isActive ? `1px solid color-mix(in srgb, var(--mantine-color-${meta.tone}-filled) 28%, var(--theme-gray-5))` : '1px solid transparent',
                }}
              >
                <Text size="xs" c={isActive ? `${meta.tone}.6` : 'dimmed'} fw={700}>{index + 1}</Text>
                <Text size="sm" fw={isActive ? 600 : 400}>{meta.label}</Text>
                {count > 0 && (
                  <SwarmBadge tone={isActive ? meta.tone : 'primary'} emphasis="solid" size="xs">{count}</SwarmBadge>
                )}
              </Group>
            </UnstyledButton>
          );
        })}
      </Group>
    </ScrollArea>
  );
});
