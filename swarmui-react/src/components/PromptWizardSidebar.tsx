import { memo, useMemo, useState } from 'react';
import { Box, Group, ScrollArea, Stack, Text, TextInput, Textarea, ThemeIcon, UnstyledButton } from '@mantine/core';
import { IconBookmark, IconChevronLeft, IconChevronRight, IconHistory, IconLayersIntersect, IconPlus, IconRoute, IconWand } from '@tabler/icons-react';
import { ElevatedCard, SwarmBadge, SwarmButton, SwarmSegmentedControl } from './ui';
import type { StepSelectionSummary } from '../features/promptWizard/wizardInsights';
import type {
  BuilderStep,
  PromptBundle,
  PromptPreset,
  PromptRecipe,
  PromptWizardStateSnapshot,
  StepMeta,
} from '../features/promptWizard/types';

interface PromptWizardSidebarProps {
  steps: StepMeta[];
  activeStep: BuilderStep;
  stacked?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  stepSummaries: Record<BuilderStep, StepSelectionSummary>;
  lastEditedStep: BuilderStep;
  recentSteps: BuilderStep[];
  recentGroupKeys: string[];
  profileName: string;
  nextIncompleteStep: BuilderStep | null;
  defaultPresets: PromptPreset[];
  customPresets: PromptPreset[];
  sessionBundles: PromptBundle[];
  savedRecipes: PromptRecipe[];
  savedStates: PromptWizardStateSnapshot[];
  onJumpStep: (step: BuilderStep) => void;
  onApplyPreset: (tagIds: string[]) => void;
  onApplyBundle: (bundleId: string, mode?: 'merge' | 'replace') => void;
  onRemoveBundle: (bundleId: string) => void;
  onApplyRecipe: (recipeId: string, mode?: 'merge' | 'replace') => void;
  onRemoveRecipe: (recipeId: string) => void;
  onLoadState: (snapshotId: string) => void;
  onRemoveState: (snapshotId: string) => void;
  onSaveBundle: (name: string, description?: string) => void;
  onSaveRecipe: (name: string, description?: string) => void;
  onSaveState: (name: string, description?: string) => void;
}

type LibraryTab = 'presets' | 'bundles' | 'recipes' | 'states';

function formatStepLabel(steps: StepMeta[], step: BuilderStep): string {
  return steps.find((meta) => meta.step === step)?.label ?? step;
}

export const PromptWizardSidebar = memo(function PromptWizardSidebar({
  steps,
  activeStep,
  stacked = false,
  collapsed = false,
  onToggleCollapsed,
  stepSummaries,
  lastEditedStep,
  recentSteps,
  recentGroupKeys,
  profileName,
  nextIncompleteStep,
  defaultPresets,
  customPresets,
  sessionBundles,
  savedRecipes,
  savedStates,
  onJumpStep,
  onApplyPreset,
  onApplyBundle,
  onRemoveBundle,
  onApplyRecipe,
  onRemoveRecipe,
  onLoadState,
  onRemoveState,
  onSaveBundle,
  onSaveRecipe,
  onSaveState,
}: PromptWizardSidebarProps) {
  const [activeLibraryTab, setActiveLibraryTab] = useState<LibraryTab>('presets');
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const combinedPresets = useMemo(
    () => [...defaultPresets, ...customPresets].filter((preset) => preset.step === activeStep || preset.step === 'style'),
    [activeStep, customPresets, defaultPresets]
  );

  const saveCurrentDraft = () => {
    const name = draftName.trim();
    if (!name) {
      return;
    }
    if (activeLibraryTab === 'bundles') {
      onSaveBundle(name, draftDescription.trim() || undefined);
    }
    else if (activeLibraryTab === 'recipes') {
      onSaveRecipe(name, draftDescription.trim() || undefined);
    }
    else if (activeLibraryTab === 'states') {
      onSaveState(name, draftDescription.trim() || undefined);
    }
    setDraftName('');
    setDraftDescription('');
  };

  if (collapsed && !stacked) {
    return (
      <Box
        style={{
          width: 82,
          minWidth: 82,
          height: '100%',
          borderRight: '1px solid var(--mantine-color-default-border)',
          background: 'color-mix(in srgb, var(--elevation-raised) 70%, transparent)',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <Stack gap="sm" p="sm" align="center">
          <UnstyledButton
            onClick={onToggleCollapsed}
            aria-label="Expand prompt wizard sidebar"
            style={{ borderRadius: 'var(--mantine-radius-md)' }}
          >
            <ThemeIcon size={36} radius="md" variant="light" color="gray">
              <IconChevronRight size={18} />
            </ThemeIcon>
          </UnstyledButton>

          <SwarmBadge tone="secondary" emphasis="soft" size="lg">
            {profileName.split(/\s+/)[0] ?? 'Profile'}
          </SwarmBadge>

          <Stack gap="xs" align="center" w="100%">
            {steps.map((step) => {
              const summary = stepSummaries[step.step];
              const tone = step.step === activeStep
                ? step.tone
                : summary.completion === 'strong'
                  ? 'success'
                  : summary.completion === 'started'
                    ? step.tone
                    : 'secondary';
              return (
                <UnstyledButton
                  key={step.step}
                  onClick={() => onJumpStep(step.step)}
                  title={`${step.label}: ${summary.count} selected`}
                  style={{ width: '100%' }}
                >
                  <Box
                    p={6}
                    style={{
                      borderRadius: 'var(--mantine-radius-md)',
                      border: '1px solid var(--mantine-color-default-border)',
                      background: step.step === activeStep ? `color-mix(in srgb, var(--mantine-color-${step.tone}-light) 55%, transparent)` : 'transparent',
                    }}
                  >
                    <Stack gap={2} align="center">
                      <SwarmBadge tone={tone} emphasis={step.step === activeStep ? 'solid' : 'soft'}>
                        {step.label.slice(0, 2).toUpperCase()}
                      </SwarmBadge>
                      <Text size="xs" c="dimmed">
                        {summary.count}
                      </Text>
                    </Stack>
                  </Box>
                </UnstyledButton>
              );
            })}
          </Stack>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      style={{
        width: stacked ? '100%' : 356,
        minWidth: stacked ? 0 : 356,
        maxHeight: stacked ? 296 : 'none',
        minHeight: 0,
        height: stacked ? 296 : '100%',
        borderRight: stacked ? 'none' : '1px solid var(--mantine-color-default-border)',
        borderBottom: stacked ? '1px solid var(--mantine-color-default-border)' : 'none',
        background: 'color-mix(in srgb, var(--elevation-raised) 62%, transparent)',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <ScrollArea offsetScrollbars scrollbarSize={8} style={{ height: '100%' }}>
        <Stack gap="md" p="md">
          <ElevatedCard elevation="floor" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={700} size="md">Build Flow</Text>
                <Group gap="xs" align="center">
                  <SwarmBadge tone="secondary" emphasis="soft">{profileName}</SwarmBadge>
                  {!stacked && onToggleCollapsed && (
                    <UnstyledButton onClick={onToggleCollapsed} aria-label="Collapse prompt wizard sidebar" style={{ borderRadius: 'var(--mantine-radius-sm)' }}>
                      <ThemeIcon size={30} radius="md" variant="light" color="gray">
                        <IconChevronLeft size={16} />
                      </ThemeIcon>
                    </UnstyledButton>
                  )}
                </Group>
              </Group>
              <Group grow wrap={stacked ? 'wrap' : 'nowrap'}>
                <SwarmButton
                  tone="primary"
                  emphasis="soft"
                  leftSection={<IconRoute size={15} />}
                  disabled={!nextIncompleteStep}
                  onClick={() => nextIncompleteStep && onJumpStep(nextIncompleteStep)}
                >
                  Next incomplete
                </SwarmButton>
                <SwarmButton
                  tone="secondary"
                  emphasis="soft"
                  leftSection={<IconHistory size={15} />}
                  disabled={!lastEditedStep}
                  onClick={() => onJumpStep(lastEditedStep)}
                >
                  Recent step
                </SwarmButton>
              </Group>
              <Text size="sm" c="dimmed">
                Recent steps: {recentSteps.slice(0, 4).map((step) => formatStepLabel(steps, step)).join(' / ') || 'None yet'}
              </Text>
              {recentGroupKeys.length > 0 && (
                <Text size="sm" c="dimmed">
                  Recent groups: {recentGroupKeys.slice(0, 3).join(' / ')}
                </Text>
              )}
            </Stack>
          </ElevatedCard>

          <ElevatedCard elevation="floor" withBorder>
            <Stack gap="sm">
              <Text fw={700} size="md">Step Summary</Text>
              {steps.map((step) => {
                const summary = stepSummaries[step.step];
                const isActive = step.step === activeStep;
                const completionTone = summary.completion === 'strong' ? 'success' : summary.completion === 'started' ? step.tone : 'secondary';
                return (
                  <Box
                    key={step.step}
                    p="sm"
                    onClick={() => onJumpStep(step.step)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 'var(--mantine-radius-md)',
                      border: `1px solid ${isActive ? `color-mix(in srgb, var(--mantine-color-${step.tone}-filled) 36%, var(--mantine-color-default-border))` : 'var(--mantine-color-default-border)'}`,
                      background: isActive ? `color-mix(in srgb, var(--mantine-color-${step.tone}-light) 55%, transparent)` : 'transparent',
                    }}
                  >
                    <Stack gap={6}>
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">{step.label}</Text>
                        <Group gap={6}>
                          {summary.explicitCount > 0 && <SwarmBadge tone="danger" emphasis="soft">Explicit {summary.explicitCount}</SwarmBadge>}
                          <SwarmBadge tone={completionTone} emphasis="soft">{summary.completion}</SwarmBadge>
                        </Group>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {summary.count === 0 ? 'Nothing selected yet.' : summary.tags.map((tag) => tag.text).join(', ')}
                      </Text>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </ElevatedCard>

          <ElevatedCard elevation="floor" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={700} size="md">My Library</Text>
                <SwarmBadge tone="secondary" emphasis="soft">
                  {activeLibraryTab === 'presets' ? combinedPresets.length : activeLibraryTab === 'bundles' ? sessionBundles.length : activeLibraryTab === 'recipes' ? savedRecipes.length : savedStates.length}
                </SwarmBadge>
              </Group>
              <SwarmSegmentedControl
                value={activeLibraryTab}
                onChange={(value) => setActiveLibraryTab(value as LibraryTab)}
                data={[
                  { label: 'Presets', value: 'presets' },
                  { label: 'Bundles', value: 'bundles' },
                  { label: 'Recipes', value: 'recipes' },
                  { label: 'States', value: 'states' },
                ]}
                fullWidth
              />

              {activeLibraryTab !== 'presets' && (
                <Stack gap="xs">
                  <TextInput
                    size="sm"
                    placeholder={activeLibraryTab === 'bundles' ? 'Save current selection as bundle' : activeLibraryTab === 'recipes' ? 'Save current build as recipe' : 'Save current wizard state'}
                    value={draftName}
                    onChange={(event) => setDraftName(event.currentTarget.value)}
                  />
                  <Textarea
                    size="xs"
                    autosize
                    minRows={2}
                    maxRows={3}
                    placeholder="Optional note"
                    value={draftDescription}
                    onChange={(event) => setDraftDescription(event.currentTarget.value)}
                  />
                  <SwarmButton
                    tone="primary"
                    emphasis="soft"
                    leftSection={<IconPlus size={15} />}
                    onClick={saveCurrentDraft}
                    disabled={!draftName.trim()}
                  >
                    Save current {activeLibraryTab.slice(0, -1)}
                  </SwarmButton>
                </Stack>
              )}

              <Stack gap="xs">
                {activeLibraryTab === 'presets' && combinedPresets.map((preset) => (
                  <ElevatedCard key={preset.id} elevation="paper" withBorder>
                    <Stack gap={6}>
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">{preset.name}</Text>
                        <SwarmBadge tone="secondary" emphasis="soft">{formatStepLabel(steps, preset.step)}</SwarmBadge>
                      </Group>
                      {preset.description && <Text size="xs" c="dimmed">{preset.description}</Text>}
                      <SwarmButton tone="secondary" emphasis="soft" leftSection={<IconWand size={14} />} onClick={() => onApplyPreset(preset.tagIds)}>
                        Apply preset
                      </SwarmButton>
                    </Stack>
                  </ElevatedCard>
                ))}

                {activeLibraryTab === 'bundles' && sessionBundles.map((bundle) => (
                  <ElevatedCard key={bundle.id} elevation="paper" withBorder>
                    <Stack gap={6}>
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">{bundle.name}</Text>
                        <SwarmBadge tone="secondary" emphasis="soft">{bundle.tagIds.length} tags</SwarmBadge>
                      </Group>
                      {bundle.description && <Text size="xs" c="dimmed">{bundle.description}</Text>}
                      <Group grow>
                        <SwarmButton tone="secondary" emphasis="soft" leftSection={<IconLayersIntersect size={14} />} onClick={() => onApplyBundle(bundle.id, 'merge')}>
                          Merge
                        </SwarmButton>
                        <SwarmButton tone="secondary" emphasis="ghost" onClick={() => onRemoveBundle(bundle.id)}>
                          Remove
                        </SwarmButton>
                      </Group>
                    </Stack>
                  </ElevatedCard>
                ))}

                {activeLibraryTab === 'recipes' && savedRecipes.map((recipe) => (
                  <ElevatedCard key={recipe.id} elevation="paper" withBorder>
                    <Stack gap={6}>
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">{recipe.name}</Text>
                        <SwarmBadge tone="secondary" emphasis="soft">{recipe.tagIds.length} tags</SwarmBadge>
                      </Group>
                      {recipe.description && <Text size="xs" c="dimmed">{recipe.description}</Text>}
                      <Group grow>
                        <SwarmButton tone="secondary" emphasis="soft" leftSection={<IconBookmark size={14} />} onClick={() => onApplyRecipe(recipe.id, 'merge')}>
                          Merge
                        </SwarmButton>
                        <SwarmButton tone="secondary" emphasis="ghost" onClick={() => onApplyRecipe(recipe.id, 'replace')}>
                          Replace
                        </SwarmButton>
                      </Group>
                      <SwarmButton tone="secondary" emphasis="ghost" onClick={() => onRemoveRecipe(recipe.id)}>
                        Remove
                      </SwarmButton>
                    </Stack>
                  </ElevatedCard>
                ))}

                {activeLibraryTab === 'states' && savedStates.map((snapshot) => (
                  <ElevatedCard key={snapshot.id} elevation="paper" withBorder>
                    <Stack gap={6}>
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">{snapshot.name}</Text>
                        <SwarmBadge tone="secondary" emphasis="soft">{snapshot.selectedTagIds.length} tags</SwarmBadge>
                      </Group>
                      {snapshot.description && <Text size="xs" c="dimmed">{snapshot.description}</Text>}
                      <Text size="xs" c="dimmed">Resume on {formatStepLabel(steps, snapshot.activeStep)}</Text>
                      <Group grow>
                        <SwarmButton tone="secondary" emphasis="soft" leftSection={<IconHistory size={14} />} onClick={() => onLoadState(snapshot.id)}>
                          Load state
                        </SwarmButton>
                        <SwarmButton tone="secondary" emphasis="ghost" onClick={() => onRemoveState(snapshot.id)}>
                          Remove
                        </SwarmButton>
                      </Group>
                    </Stack>
                  </ElevatedCard>
                ))}

                {((activeLibraryTab === 'presets' && combinedPresets.length === 0)
                  || (activeLibraryTab === 'bundles' && sessionBundles.length === 0)
                  || (activeLibraryTab === 'recipes' && savedRecipes.length === 0)
                  || (activeLibraryTab === 'states' && savedStates.length === 0)) && (
                  <Text size="sm" c="dimmed">
                    {activeLibraryTab === 'presets'
                      ? 'No presets are available for this step yet.'
                      : `No ${activeLibraryTab} saved yet.`}
                  </Text>
                )}
              </Stack>
            </Stack>
          </ElevatedCard>
        </Stack>
      </ScrollArea>
    </Box>
  );
});
