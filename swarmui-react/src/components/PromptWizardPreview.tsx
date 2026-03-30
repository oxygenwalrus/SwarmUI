import { memo, useMemo } from 'react';
import { Box, Group, Menu, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconCopy, IconPlus, IconSend, IconSparkles, IconTrash, IconX } from '@tabler/icons-react';
import { SwarmBadge, SwarmButton, SwarmActionIcon } from './ui';
import { STEP_META } from '../features/promptWizard/steps';
import type { BuilderStep, PromptHealthIssue, PromptTag } from '../features/promptWizard/types';

interface PromptWizardPreviewProps {
  positivePreview: string;
  negativePreview: string;
  positiveCount: number;
  negativeCount: number;
  explicitCount: number;
  profileName: string;
  profileStepSummary: string;
  healthIssues: PromptHealthIssue[];
  onSendToGenerate: () => void;
  onAppendToGenerate: () => void;
  onCopyPositive: () => void;
  onCopyNegative: () => void;
  onClear: () => void;
  hasSelection: boolean;
  /** When rendered as a side panel, these are needed to show grouped selected tags */
  selectedTags?: PromptTag[];
  tagWeights?: Record<string, number>;
  onDeselectTag?: (tagId: string) => void;
  activeStep?: BuilderStep;
  onJumpStep?: (step: BuilderStep) => void;
}

export const PromptWizardPreview = memo(function PromptWizardPreview({
  positivePreview,
  negativePreview,
  positiveCount,
  negativeCount,
  explicitCount,
  profileName,
  healthIssues,
  onSendToGenerate,
  onAppendToGenerate,
  onCopyPositive,
  onCopyNegative,
  onClear,
  hasSelection,
  selectedTags,
  tagWeights,
  onDeselectTag,
  activeStep,
  onJumpStep,
}: PromptWizardPreviewProps) {
  // Group selected tags by step
  const tagsByStep = useMemo(() => {
    if (!selectedTags) return [];
    const map = new Map<BuilderStep, PromptTag[]>();
    for (const tag of selectedTags) {
      const arr = map.get(tag.step) ?? [];
      arr.push(tag);
      map.set(tag.step, arr);
    }
    // Order by STEP_META order
    return STEP_META
      .filter((meta) => map.has(meta.step))
      .map((meta) => ({
        step: meta.step,
        label: meta.label,
        tone: meta.tone,
        tags: map.get(meta.step)!,
      }));
  }, [selectedTags]);

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        borderLeft: '1px solid var(--mantine-color-default-border)',
        background: 'color-mix(in srgb, var(--elevation-raised) 50%, transparent)',
      }}
    >
      {/* Canvas header */}
      <Box
        px="sm"
        py={8}
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          flexShrink: 0,
        }}
      >
        <Group justify="space-between" align="center">
          <Text fw={700} size="sm">Prompt Canvas</Text>
          <Group gap={4}>
            <SwarmBadge tone="primary" emphasis="soft" size="sm">{positiveCount}</SwarmBadge>
            {negativeCount > 0 && (
              <SwarmBadge tone="warning" emphasis="soft" size="sm">-{negativeCount}</SwarmBadge>
            )}
            {explicitCount > 0 && (
              <SwarmBadge tone="danger" emphasis="soft" size="sm">18+</SwarmBadge>
            )}
          </Group>
        </Group>
      </Box>

      {/* Selected tags grouped by step */}
      <ScrollArea
        offsetScrollbars
        scrollbarSize={6}
        style={{ flex: 1, minHeight: 0 }}
      >
        <Box px="sm" py="xs">
          {tagsByStep.length === 0 ? (
            <Stack align="center" gap="sm" py="xl">
              <IconSparkles size={24} style={{ opacity: 0.3 }} />
              <Text size="sm" c="dimmed" ta="center">
                Select tags from the palette to build your prompt.
              </Text>
            </Stack>
          ) : (
            <Stack gap="sm">
              {tagsByStep.map((group) => (
                <Box key={group.step}>
                  <UnstyledStepHeader
                    label={group.label}
                    tone={group.tone}
                    count={group.tags.length}
                    isActive={group.step === activeStep}
                    onClick={() => onJumpStep?.(group.step)}
                  />
                  <Group gap={4} mt={4}>
                    {group.tags.map((tag) => {
                      const weight = tagWeights?.[tag.id];
                      const weightLabel = weight && weight !== 1.0 ? ` (${weight.toFixed(1)})` : '';
                      return (
                        <SwarmBadge
                          key={tag.id}
                          tone={group.tone}
                          emphasis="soft"
                          size="sm"
                          style={{ cursor: 'pointer', paddingRight: onDeselectTag ? 4 : undefined }}
                        >
                          <Group gap={4} wrap="nowrap" align="center">
                            <span style={{ fontSize: '0.8rem' }}>{tag.text}{weightLabel}</span>
                            {onDeselectTag && (
                              <SwarmActionIcon
                                tone="secondary"
                                emphasis="ghost"
                                size="xs"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation();
                                  onDeselectTag(tag.id);
                                }}
                                label={`Remove ${tag.text}`}
                                style={{ width: 16, height: 16, minWidth: 16, minHeight: 16 }}
                              >
                                <IconX size={10} />
                              </SwarmActionIcon>
                            )}
                          </Group>
                        </SwarmBadge>
                      );
                    })}
                  </Group>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </ScrollArea>

      {/* Health issues */}
      {healthIssues.length > 0 && (
        <Box px="sm" py={4} style={{ borderTop: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}>
          <Group gap={4}>
            {healthIssues.map((issue) => (
              <SwarmBadge key={issue.id} tone={issue.tone} emphasis="soft" size="sm" title={issue.detail}>
                <Group gap={3} wrap="nowrap">
                  <IconAlertTriangle size={10} />
                  <span style={{ fontSize: '0.75rem' }}>{issue.title}</span>
                </Group>
              </SwarmBadge>
            ))}
          </Group>
        </Box>
      )}

      {/* Text previews + actions */}
      <Box
        px="sm"
        py="xs"
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          flexShrink: 0,
        }}
      >
        <Stack gap={6}>
          <Group justify="space-between" align="center">
            <Text fw={600} size="xs" c="dimmed">PREVIEW</Text>
            <Group gap={4}>
              <SwarmBadge tone="secondary" emphasis="ghost" size="sm">
                <Group gap={3} wrap="nowrap">
                  <IconSparkles size={10} />
                  <span style={{ fontSize: '0.7rem' }}>{profileName}</span>
                </Group>
              </SwarmBadge>
            </Group>
          </Group>

          <Textarea
            value={positivePreview}
            readOnly
            autosize
            minRows={1}
            maxRows={3}
            placeholder="Select tags to preview..."
            styles={{
              input: {
                fontFamily: 'monospace',
                fontSize: 'var(--mantine-font-size-xs)',
                padding: '6px 8px',
              },
            }}
          />

          {negativePreview && (
            <Textarea
              value={negativePreview}
              readOnly
              autosize
              minRows={1}
              maxRows={2}
              styles={{
                input: {
                  fontFamily: 'monospace',
                  fontSize: 'var(--mantine-font-size-xs)',
                  color: 'var(--mantine-color-red-text)',
                  padding: '6px 8px',
                },
              }}
            />
          )}

          {/* Send to Generate split button */}
          <Group gap={0}>
            <SwarmButton
              tone="primary"
              size="compact-sm"
              leftSection={<IconSend size={14} />}
              onClick={onSendToGenerate}
              disabled={!positivePreview}
              style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, flex: 1 }}
            >
              Send to Generate
            </SwarmButton>
            <Menu position="bottom-end" withArrow shadow="md">
              <Menu.Target>
                <SwarmButton
                  tone="primary"
                  size="compact-sm"
                  disabled={!positivePreview}
                  style={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    borderLeft: '1px solid rgba(255,255,255,0.2)',
                    paddingInline: 6,
                    minWidth: 'auto',
                  }}
                >
                  <IconChevronDown size={14} />
                </SwarmButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconSend size={14} />} onClick={onSendToGenerate} disabled={!positivePreview}>
                  Replace prompt
                </Menu.Item>
                <Menu.Item leftSection={<IconPlus size={14} />} onClick={onAppendToGenerate} disabled={!positivePreview}>
                  Append to prompt
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyPositive} disabled={!positivePreview}>
                  Copy positive
                </Menu.Item>
                {negativePreview && (
                  <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyNegative}>
                    Copy negative
                  </Menu.Item>
                )}
              </Menu.Dropdown>
            </Menu>
          </Group>

          <SwarmButton
            tone="secondary"
            emphasis="ghost"
            size="compact-xs"
            leftSection={<IconTrash size={12} />}
            onClick={onClear}
            disabled={!hasSelection}
            fullWidth
          >
            Clear all
          </SwarmButton>
        </Stack>
      </Box>
    </Box>
  );
});

/** Small internal helper for step group headers in the canvas */
function UnstyledStepHeader({
  label,
  tone,
  count,
  isActive,
  onClick,
}: {
  label: string;
  tone: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3px 6px',
        borderRadius: 'var(--mantine-radius-sm)',
        background: isActive
          ? `color-mix(in srgb, var(--mantine-color-${tone}-light) 50%, transparent)`
          : 'transparent',
        cursor: 'pointer',
      }}
    >
      <Text size="xs" fw={700} c={isActive ? `${tone}.6` : 'dimmed'}>
        {label}
      </Text>
      <Text size="xs" c="dimmed">{count}</Text>
    </Box>
  );
}
