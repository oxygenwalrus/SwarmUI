import { memo, useMemo, useState } from 'react';
import { Box, Drawer, Group, ScrollArea, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { IconBookmark, IconHistory, IconLayersIntersect, IconPlus, IconRoute, IconWand } from '@tabler/icons-react';
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
  opened: boolean;
  onClose: () => void;
  steps: StepMeta[];
  activeStep: BuilderStep;
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
  opened,
  onClose,
  steps,
  activeStep,
  stepSummaries,
  lastEditedStep,
  recentSteps,
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
    if (!name) return;
    if (activeLibraryTab === 'bundles') onSaveBundle(name, draftDescription.trim() || undefined);
    else if (activeLibraryTab === 'recipes') onSaveRecipe(name, draftDescription.trim() || undefined);
    else if (activeLibraryTab === 'states') onSaveState(name, draftDescription.trim() || undefined);
    setDraftName('');
    setDraftDescription('');
  };

  const handleJumpStep = (step: BuilderStep) => {
    onJumpStep(step);
    onClose();
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title="Build Tools"
      position="left"
      size="sm"
      overlayProps={{ backgroundOpacity: 0.15, blur: 2 }}
    >
      <ScrollArea offsetScrollbars scrollbarSize={8} style={{ height: 'calc(100vh - 80px)' }}>
        <Stack gap="md">
          {/* Quick navigation */}
          <ElevatedCard elevation="floor" withBorder>
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Text fw={700} size="md">Build Flow</Text>
                <SwarmBadge tone="secondary" emphasis="soft">{profileName}</SwarmBadge>
              </Group>
              <Group grow>
                <SwarmButton
                  tone="primary"
                  emphasis="soft"
                  leftSection={<IconRoute size={15} />}
                  disabled={!nextIncompleteStep}
                  onClick={() => nextIncompleteStep && handleJumpStep(nextIncompleteStep)}
                >
                  Next incomplete
                </SwarmButton>
                <SwarmButton
                  tone="secondary"
                  emphasis="soft"
                  leftSection={<IconHistory size={15} />}
                  disabled={!lastEditedStep}
                  onClick={() => handleJumpStep(lastEditedStep)}
                >
                  Recent step
                </SwarmButton>
              </Group>
              <Text size="sm" c="dimmed">
                Recent: {recentSteps.slice(0, 4).map((step) => formatStepLabel(steps, step)).join(' / ') || 'None'}
              </Text>
            </Stack>
          </ElevatedCard>

          {/* Step summary */}
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
                    p="xs"
                    onClick={() => handleJumpStep(step.step)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 'var(--mantine-radius-md)',
                      border: `1px solid ${isActive ? `color-mix(in srgb, var(--mantine-color-${step.tone}-filled) 36%, var(--mantine-color-default-border))` : 'var(--mantine-color-default-border)'}`,
                      background: isActive ? `color-mix(in srgb, var(--mantine-color-${step.tone}-light) 55%, transparent)` : 'transparent',
                    }}
                  >
                    <Group justify="space-between" align="center">
                      <Text fw={600} size="sm">{step.label}</Text>
                      <Group gap={4}>
                        {summary.explicitCount > 0 && <SwarmBadge tone="danger" emphasis="soft" size="sm">18+ {summary.explicitCount}</SwarmBadge>}
                        <SwarmBadge tone={completionTone} emphasis="soft" size="sm">{summary.count}</SwarmBadge>
                      </Group>
                    </Group>
                    {summary.count > 0 && (
                      <Text size="xs" c="dimmed" lineClamp={1} mt={2}>
                        {summary.tags.map((tag) => tag.text).join(', ')}
                      </Text>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </ElevatedCard>

          {/* Library */}
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
                    placeholder={`Save as ${activeLibraryTab.slice(0, -1)}...`}
                    value={draftName}
                    onChange={(e) => setDraftName(e.currentTarget.value)}
                  />
                  <Textarea
                    size="xs"
                    autosize
                    minRows={2}
                    maxRows={3}
                    placeholder="Optional note"
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.currentTarget.value)}
                  />
                  <SwarmButton
                    tone="primary"
                    emphasis="soft"
                    leftSection={<IconPlus size={15} />}
                    onClick={saveCurrentDraft}
                    disabled={!draftName.trim()}
                  >
                    Save {activeLibraryTab.slice(0, -1)}
                  </SwarmButton>
                </Stack>
              )}

              <Stack gap="xs">
                {activeLibraryTab === 'presets' && combinedPresets.map((preset) => (
                  <ElevatedCard key={preset.id} elevation="paper" withBorder>
                    <Stack gap={4}>
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">{preset.name}</Text>
                        <SwarmBadge tone="secondary" emphasis="soft" size="sm">{formatStepLabel(steps, preset.step)}</SwarmBadge>
                      </Group>
                      {preset.description && <Text size="xs" c="dimmed">{preset.description}</Text>}
                      <SwarmButton tone="secondary" emphasis="soft" leftSection={<IconWand size={14} />} onClick={() => onApplyPreset(preset.tagIds)} size="compact-sm">
                        Apply
                      </SwarmButton>
                    </Stack>
                  </ElevatedCard>
                ))}

                {activeLibraryTab === 'bundles' && sessionBundles.map((bundle) => (
                  <ElevatedCard key={bundle.id} elevation="paper" withBorder>
                    <Stack gap={4}>
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">{bundle.name}</Text>
                        <SwarmBadge tone="secondary" emphasis="soft" size="sm">{bundle.tagIds.length}</SwarmBadge>
                      </Group>
                      <Group grow gap={4}>
                        <SwarmButton tone="secondary" emphasis="soft" size="compact-sm" leftSection={<IconLayersIntersect size={12} />} onClick={() => onApplyBundle(bundle.id, 'merge')}>Merge</SwarmButton>
                        <SwarmButton tone="secondary" emphasis="ghost" size="compact-sm" onClick={() => onRemoveBundle(bundle.id)}>Remove</SwarmButton>
                      </Group>
                    </Stack>
                  </ElevatedCard>
                ))}

                {activeLibraryTab === 'recipes' && savedRecipes.map((recipe) => (
                  <ElevatedCard key={recipe.id} elevation="paper" withBorder>
                    <Stack gap={4}>
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">{recipe.name}</Text>
                        <SwarmBadge tone="secondary" emphasis="soft" size="sm">{recipe.tagIds.length}</SwarmBadge>
                      </Group>
                      <Group grow gap={4}>
                        <SwarmButton tone="secondary" emphasis="soft" size="compact-sm" leftSection={<IconBookmark size={12} />} onClick={() => onApplyRecipe(recipe.id, 'merge')}>Merge</SwarmButton>
                        <SwarmButton tone="secondary" emphasis="ghost" size="compact-sm" onClick={() => onApplyRecipe(recipe.id, 'replace')}>Replace</SwarmButton>
                      </Group>
                      <SwarmButton tone="secondary" emphasis="ghost" size="compact-xs" onClick={() => onRemoveRecipe(recipe.id)}>Remove</SwarmButton>
                    </Stack>
                  </ElevatedCard>
                ))}

                {activeLibraryTab === 'states' && savedStates.map((snapshot) => (
                  <ElevatedCard key={snapshot.id} elevation="paper" withBorder>
                    <Stack gap={4}>
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="sm">{snapshot.name}</Text>
                        <SwarmBadge tone="secondary" emphasis="soft" size="sm">{snapshot.selectedTagIds.length}</SwarmBadge>
                      </Group>
                      <Group grow gap={4}>
                        <SwarmButton tone="secondary" emphasis="soft" size="compact-sm" leftSection={<IconHistory size={12} />} onClick={() => onLoadState(snapshot.id)}>Load</SwarmButton>
                        <SwarmButton tone="secondary" emphasis="ghost" size="compact-sm" onClick={() => onRemoveState(snapshot.id)}>Remove</SwarmButton>
                      </Group>
                    </Stack>
                  </ElevatedCard>
                ))}

                {((activeLibraryTab === 'presets' && combinedPresets.length === 0)
                  || (activeLibraryTab === 'bundles' && sessionBundles.length === 0)
                  || (activeLibraryTab === 'recipes' && savedRecipes.length === 0)
                  || (activeLibraryTab === 'states' && savedStates.length === 0)) && (
                  <Text size="sm" c="dimmed">
                    {activeLibraryTab === 'presets' ? 'No presets for this step.' : `No ${activeLibraryTab} saved yet.`}
                  </Text>
                )}
              </Stack>
            </Stack>
          </ElevatedCard>
        </Stack>
      </ScrollArea>
    </Drawer>
  );
});
