import { memo } from 'react';
import { Group, ScrollArea, Text, UnstyledButton } from '@mantine/core';
import { SwarmBadge } from './ui';
import type { BuilderStep, StepMeta, StepCompletion } from '../features/promptWizard/types';

interface PromptWizardStepsProps {
  steps: StepMeta[];
  activeStep: BuilderStep;
  tagCountsByStep: Record<BuilderStep, number>;
  completionByStep: Record<BuilderStep, StepCompletion>;
  onStepClick: (step: BuilderStep) => void;
}

export const PromptWizardSteps = memo(function PromptWizardSteps({
  steps,
  activeStep,
  tagCountsByStep,
  completionByStep,
  onStepClick,
}: PromptWizardStepsProps) {
  return (
    <ScrollArea offsetScrollbars>
      <Group gap="xs" wrap="nowrap" px="lg" py="xs">
        {steps.map((meta, index) => {
          const isActive = meta.step === activeStep;
          const count = tagCountsByStep[meta.step] ?? 0;
          const completion = completionByStep[meta.step] ?? 'empty';
          const completionTone = completion === 'strong' ? 'success' : completion === 'started' ? meta.tone : 'secondary';
          return (
            <UnstyledButton key={meta.step} onClick={() => onStepClick(meta.step)}>
              <Group
                gap={5}
                wrap="nowrap"
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--mantine-radius-md)',
                  background: isActive ? `color-mix(in srgb, var(--mantine-color-${meta.tone}-light) 75%, var(--elevation-raised))` : undefined,
                  border: isActive ? `1px solid color-mix(in srgb, var(--mantine-color-${meta.tone}-filled) 28%, var(--theme-gray-5))` : '1px solid transparent',
                }}
              >
                <Text size="xs" c={isActive ? `${meta.tone}.6` : 'dimmed'} fw={700}>{index + 1}</Text>
                <Text size="sm" fw={isActive ? 600 : 500}>{meta.label}</Text>
                <SwarmBadge tone={completionTone} emphasis="soft" size="sm">{completion}</SwarmBadge>
                {count > 0 && (
                  <SwarmBadge tone={isActive ? meta.tone : 'primary'} emphasis="solid" size="sm">{count}</SwarmBadge>
                )}
              </Group>
            </UnstyledButton>
          );
        })}
      </Group>
    </ScrollArea>
  );
});
