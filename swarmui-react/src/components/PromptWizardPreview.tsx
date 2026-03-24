import { memo } from 'react';
import { Box, Group, Stack, Text, Textarea } from '@mantine/core';
import { IconAlertTriangle, IconPlus, IconSparkles, IconTrash } from '@tabler/icons-react';
import { SwarmBadge, SwarmButton } from './ui';
import type { PromptHealthIssue } from '../features/promptWizard/types';

interface PromptWizardPreviewProps {
  positivePreview: string;
  negativePreview: string;
  positiveCount: number;
  negativeCount: number;
  explicitCount: number;
  profileName: string;
  profileStepSummary: string;
  healthIssues: PromptHealthIssue[];
  onApplyToPrompt: () => void;
  onApplyToNegative: () => void;
  onClear: () => void;
  hasSelection: boolean;
}

export const PromptWizardPreview = memo(function PromptWizardPreview({
  positivePreview,
  negativePreview,
  positiveCount,
  negativeCount,
  explicitCount,
  profileName,
  profileStepSummary,
  healthIssues,
  onApplyToPrompt,
  onApplyToNegative,
  onClear,
  hasSelection,
}: PromptWizardPreviewProps) {
  return (
    <Box
      px="md"
      py="xs"
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
        background: 'color-mix(in srgb, var(--elevation-table) 92%, transparent)',
        backdropFilter: 'blur(8px)',
        flexShrink: 0,
      }}
    >
      <Stack gap="xs">
        <Group gap="xs" wrap="wrap">
          <SwarmBadge tone="primary" emphasis="soft">Positive {positiveCount}</SwarmBadge>
          <SwarmBadge tone={negativeCount > 0 ? 'warning' : 'secondary'} emphasis="soft">Negative {negativeCount}</SwarmBadge>
          <SwarmBadge tone={explicitCount > 0 ? 'danger' : 'secondary'} emphasis="soft">Explicit {explicitCount}</SwarmBadge>
          <SwarmBadge tone="secondary" emphasis="soft">
            <Group gap={4} wrap="nowrap">
              <IconSparkles size={11} />
              <span>{profileName}</span>
            </Group>
          </SwarmBadge>
          <Text size="xs" c="dimmed">
            {profileStepSummary}
          </Text>
        </Group>

        {healthIssues.length > 0 && (
          <Stack gap="xs">
            <Text fw={600} size="xs">Prompt Health</Text>
            <Group gap="xs">
              {healthIssues.map((issue) => (
                <SwarmBadge key={issue.id} tone={issue.tone} emphasis="soft" title={issue.detail}>
                  <Group gap={4} wrap="nowrap">
                    <IconAlertTriangle size={12} />
                    <span>{issue.title}</span>
                  </Group>
                </SwarmBadge>
              ))}
            </Group>
          </Stack>
        )}

        <Group justify="space-between" align="center">
          <Text fw={600} size="md">Prompt Preview</Text>
          <SwarmButton
            tone="secondary"
            emphasis="ghost"
            size="compact-xs"
            leftSection={<IconTrash size={14} />}
            onClick={onClear}
            disabled={!hasSelection}
          >
            Clear all
          </SwarmButton>
        </Group>

        <Textarea
          value={positivePreview}
          readOnly
          autosize
          minRows={1}
          maxRows={2}
          placeholder="Select tags to preview the assembled prompt..."
          styles={{ input: { fontFamily: 'monospace', fontSize: 'var(--mantine-font-size-sm)' } }}
        />

        {negativePreview && (
          <Textarea
            value={negativePreview}
            readOnly
            autosize
            minRows={1}
            maxRows={2}
            placeholder="No negative tags selected"
            styles={{ input: { fontFamily: 'monospace', fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-red-text)' } }}
          />
        )}

        <Group grow>
          <SwarmButton
            tone="primary"
            leftSection={<IconPlus size={16} />}
            onClick={onApplyToPrompt}
            disabled={!positivePreview}
          >
            Apply to Prompt
          </SwarmButton>
          <SwarmButton
            tone="danger"
            emphasis="soft"
            leftSection={<IconPlus size={16} />}
            onClick={onApplyToNegative}
            disabled={!negativePreview}
          >
            Apply to Negative
          </SwarmButton>
        </Group>
      </Stack>
    </Box>
  );
});
