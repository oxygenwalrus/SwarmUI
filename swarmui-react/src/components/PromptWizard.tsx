import { memo, useCallback, useMemo, useState } from 'react';
import { Box, Center, Group, Loader, Modal, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconChevronRight, IconSparkles } from '@tabler/icons-react';
import { ElevatedCard, ResizeHandle, SwarmBadge, SwarmButton } from './ui';
import { PromptWizardHeader } from './PromptWizardHeader';
import { PromptWizardSidebar } from './PromptWizardSidebar';
import { PromptWizardSteps } from './PromptWizardSteps';
import { PromptWizardStepContent } from './PromptWizardStepContent';
import { PromptWizardPreview } from './PromptWizardPreview';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { usePromptWizardStore } from '../stores/promptWizardStore';
import { normalizePromptTags } from '../features/promptWizard/normalizeTags';
import { annotatePromptTags } from '../features/promptWizard/tagRelationships';
import { STEP_META, getStepMeta } from '../features/promptWizard/steps';
import { getProfile } from '../features/promptWizard/profiles';
import { assemblePrompt } from '../features/promptWizard/assemble';
import { buildPromptHealth, buildStepSummaries, findNextIncompleteStep } from '../features/promptWizard/wizardInsights';
import type { BuilderStep, PromptPreset, PromptTag } from '../features/promptWizard/types';

interface PromptWizardProps {
  onApplyToPrompt?: (text: string) => void;
  onApplyToNegative?: (text: string) => void;
  compact?: boolean;
}

// Lazy-loaded data
let defaultTagsPromise: Promise<PromptTag[]> | null = null;
let defaultPresetsPromise: Promise<PromptPreset[]> | null = null;

function loadDefaultTags(): Promise<PromptTag[]> {
  if (!defaultTagsPromise) {
    defaultTagsPromise = import('../data/promptTags.json').then((m) => annotatePromptTags(normalizePromptTags(m.default as PromptTag[])));
  }
  return defaultTagsPromise;
}

function loadDefaultPresets(): Promise<PromptPreset[]> {
  if (!defaultPresetsPromise) {
    defaultPresetsPromise = import('../data/promptQuickPresets.json').then((m) => m.default as PromptPreset[]);
  }
  return defaultPresetsPromise;
}

export const PromptWizard = memo(function PromptWizard({
  onApplyToPrompt,
  onApplyToNegative,
  compact = false,
}: PromptWizardProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'global' | 'step'>('global');
  const [defaultTags, setDefaultTags] = useState<PromptTag[]>([]);
  const [defaultPresets, setDefaultPresets] = useState<PromptPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const widthPanel = useResizablePanel({
    initialSize: 1160,
    minSize: 880,
    maxSize: 1600,
    direction: 'horizontal',
  });
  const heightPanel = useResizablePanel({
    initialSize: 900,
    minSize: 680,
    maxSize: 1200,
    direction: 'vertical',
  });

  const {
    selectedTagIds,
    manualNegativeTexts,
    activeProfileId,
    activeStep,
    lastEditedStep,
    recentSteps,
    recentGroupKeys,
    customTags,
    customPresets,
    sessionBundles,
    savedRecipes,
    savedStates,
    toggleTag,
    toggleManualNegativeText,
    clearSelections,
    setActiveStep,
    setActiveProfile,
    markStepInteraction,
    recordGroupFocus,
    applyPreset,
    saveBundle,
    applyBundle,
    removeBundle,
    saveRecipe,
    applyRecipe,
    removeRecipe,
    saveStateSnapshot,
    loadStateSnapshot,
    removeStateSnapshot,
  } = usePromptWizardStore();

  const handleOpen = useCallback(() => {
    open();
    if (hasLoaded || isLoading) {
      return;
    }
    setIsLoading(true);
    Promise.all([loadDefaultTags(), loadDefaultPresets()])
      .then(([tags, presets]) => {
        setDefaultTags(tags);
        setDefaultPresets(presets);
        setHasLoaded(true);
      })
      .catch(() => {
        notifications.show({
          title: 'Prompt Wizard Unavailable',
          message: 'Could not load tag library.',
          color: 'red',
        });
      })
      .finally(() => setIsLoading(false));
  }, [hasLoaded, isLoading, open]);

  // Merge default + custom tags
  const allTags = useMemo(() => annotatePromptTags([...defaultTags, ...customTags]), [customTags, defaultTags]);

  // When searching, show tags across all steps; otherwise scope to active step
  const hasSearch = searchQuery.trim().length > 0;
  const stepTags = useMemo(
    () => {
      if (!hasSearch) {
        return allTags.filter((t) => t.step === activeStep);
      }
      return searchScope === 'global'
        ? allTags
        : allTags.filter((t) => t.step === activeStep);
    },
    [activeStep, allTags, hasSearch, searchScope]
  );

  // Tag counts per step
  const tagCountsByStep = useMemo(() => {
    const counts = {} as Record<BuilderStep, number>;
    for (const meta of STEP_META) {
      counts[meta.step] = selectedTagIds.filter((id) =>
        allTags.some((t) => t.id === id && t.step === meta.step)
      ).length;
    }
    return counts;
  }, [selectedTagIds, allTags]);

  const selectedTagIdSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);
  const stepSummaries = useMemo(() => buildStepSummaries(STEP_META, allTags, selectedTagIdSet), [allTags, selectedTagIdSet]);
  const completionByStep = useMemo(
    () => Object.fromEntries(STEP_META.map((meta) => [meta.step, stepSummaries[meta.step].completion])) as Record<BuilderStep, 'empty' | 'started' | 'strong'>,
    [stepSummaries]
  );

  // Assembly
  const profile = getProfile(activeProfileId);
  const selectedTags = useMemo(
    () => selectedTagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean) as PromptTag[],
    [selectedTagIds, allTags]
  );
  const assembled = useMemo(
    () => profile ? assemblePrompt(selectedTags, profile) : { positive: '', negative: '' },
    [selectedTags, profile]
  );
  const mergedNegativePreview = useMemo(() => {
    const extraNegatives = manualNegativeTexts.filter((text) => !assembled.negative.toLowerCase().split(profile?.tagSeparator ?? ', ').includes(text.toLowerCase()));
    return [assembled.negative, ...extraNegatives].filter(Boolean).join(profile?.tagSeparator ?? ', ');
  }, [assembled.negative, manualNegativeTexts, profile]);
  const explicitCount = useMemo(
    () => selectedTags.filter((tag) => tag.subcategory === 'Explicit' || tag.majorGroup?.includes('Explicit')).length,
    [selectedTags]
  );
  const promptHealth = useMemo(
    () => buildPromptHealth(selectedTags, manualNegativeTexts),
    [manualNegativeTexts, selectedTags]
  );

  const handleApplyPrompt = useCallback(() => {
    if (!assembled.positive || !onApplyToPrompt) return;
    onApplyToPrompt(assembled.positive);
    notifications.show({ title: 'Prompt Applied', message: 'Tags added to the prompt.', color: 'teal' });
  }, [assembled.positive, onApplyToPrompt]);

  const handleApplyNegative = useCallback(() => {
    if (!mergedNegativePreview || !onApplyToNegative) return;
    onApplyToNegative(mergedNegativePreview);
    notifications.show({ title: 'Negative Applied', message: 'Negative tags added.', color: 'teal' });
  }, [mergedNegativePreview, onApplyToNegative]);

  const totalSelected = selectedTagIds.length;
  const stepMeta = getStepMeta(activeStep)!;
  const profileStepSummary = useMemo(
    () => (profile?.stepOrder ?? []).map((step) => getStepMeta(step)?.label ?? step).join(' -> '),
    [profile]
  );

  // Step navigation
  const profileStepOrder = profile?.stepOrder ?? STEP_META.map((m) => m.step);
  const orderedStepMeta = useMemo(
    () => profileStepOrder.map((step) => getStepMeta(step)).filter(Boolean) as typeof STEP_META,
    [profileStepOrder]
  );
  const currentStepIndex = profileStepOrder.indexOf(activeStep);
  const canGoPrev = currentStepIndex > 0;
  const canGoNext = currentStepIndex < profileStepOrder.length - 1;
  const nextIncompleteStep = useMemo(
    () => findNextIncompleteStep(orderedStepMeta, stepSummaries, activeStep),
    [activeStep, orderedStepMeta, stepSummaries]
  );
  const goToPrev = useCallback(() => {
    if (canGoPrev) setActiveStep(profileStepOrder[currentStepIndex - 1]);
  }, [canGoPrev, currentStepIndex, profileStepOrder, setActiveStep]);
  const goToNext = useCallback(() => {
    if (canGoNext) setActiveStep(profileStepOrder[currentStepIndex + 1]);
  }, [canGoNext, currentStepIndex, profileStepOrder, setActiveStep]);

  const handleToggleTag = useCallback((tagId: string) => {
    toggleTag(tagId);
    markStepInteraction(activeStep);
  }, [activeStep, markStepInteraction, toggleTag]);

  const handleSaveBundle = useCallback((name: string, description?: string) => {
    saveBundle({ name, description, tagIds: selectedTagIds });
  }, [saveBundle, selectedTagIds]);

  const handleSaveRecipe = useCallback((name: string, description?: string) => {
    saveRecipe({ name, description, profileId: activeProfileId, tagIds: selectedTagIds });
  }, [activeProfileId, saveRecipe, selectedTagIds]);

  const handleSaveState = useCallback((name: string, description?: string) => {
    saveStateSnapshot({
      name,
      description,
      profileId: activeProfileId,
      activeStep,
      selectedTagIds,
      manualNegativeTexts,
    });
  }, [activeProfileId, activeStep, manualNegativeTexts, saveStateSnapshot, selectedTagIds]);

  return (
    <>
      {/* Trigger button */}
      <UnstyledButton onClick={handleOpen} style={{ width: '100%', textAlign: 'left' }} aria-label="Open prompt wizard">
        <ElevatedCard
          elevation="paper"
          withBorder
          interactive
          className={compact ? 'generate-studio__prompt-library-card--compact' : undefined}
          style={{ padding: compact ? 10 : 14 }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={compact ? 32 : 38} radius="md" variant="light" color="gray" style={{ backgroundColor: 'var(--elevation-raised)' }}>
                <IconSparkles size={20} />
              </ThemeIcon>
              <Stack gap={2}>
                <Group gap="xs">
                  <Text fw={600} size="sm">Prompt Wizard</Text>
                  <SwarmBadge tone={totalSelected > 0 ? 'primary' : 'secondary'} emphasis="soft">
                    {totalSelected > 0 ? `${totalSelected} tags` : 'Ready'}
                  </SwarmBadge>
                </Group>
                <Text size="xs" c="dimmed">
                  {compact ? 'Build prompts step by step.' : totalSelected > 0 ? `${totalSelected} tags selected` : 'Build prompts step by step with guided tag selection'}
                </Text>
              </Stack>
            </Group>
            <ThemeIcon size={compact ? 28 : 32} radius="xl" variant="light" color="gray">
              <IconChevronRight size={18} />
            </ThemeIcon>
          </Group>
        </ElevatedCard>
      </UnstyledButton>

      {/* Wizard modal */}
      <Modal
        opened={opened}
        onClose={close}
        size={widthPanel.size}
        padding={0}
        centered
        styles={{
          content: {
            overflow: 'hidden',
            background: 'var(--elevation-table)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            width: `min(${widthPanel.size}px, 96vw)`,
            maxWidth: '96vw',
            height: `min(${heightPanel.size}px, 92vh)`,
            maxHeight: '92vh',
          },
          header: { display: 'none' },
          body: { padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
        }}
      >
        {isLoading && !hasLoaded ? (
          <Center p="xl" mih={320}>
            <Stack align="center" gap="sm">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading tag library...</Text>
            </Stack>
          </Center>
        ) : (
          <Box style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <PromptWizardHeader
              activeProfileId={activeProfileId}
              onProfileChange={setActiveProfile}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchScope={searchScope}
              onSearchScopeChange={setSearchScope}
              totalSelected={totalSelected}
              onClose={close}
            />

            <PromptWizardSteps
              steps={STEP_META}
              activeStep={activeStep}
              tagCountsByStep={tagCountsByStep}
              completionByStep={completionByStep}
              onStepClick={setActiveStep}
            />

            <Group gap={0} style={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
              <PromptWizardSidebar
                steps={orderedStepMeta}
                activeStep={activeStep}
                stepSummaries={stepSummaries}
                lastEditedStep={lastEditedStep}
                recentSteps={recentSteps}
                recentGroupKeys={recentGroupKeys}
                profileName={profile?.name ?? 'Unknown profile'}
                nextIncompleteStep={nextIncompleteStep}
                defaultPresets={defaultPresets}
                customPresets={customPresets}
                sessionBundles={sessionBundles}
                savedRecipes={savedRecipes}
                savedStates={savedStates}
                onJumpStep={setActiveStep}
                onApplyPreset={applyPreset}
                onApplyBundle={applyBundle}
                onRemoveBundle={removeBundle}
                onApplyRecipe={applyRecipe}
                onRemoveRecipe={removeRecipe}
                onLoadState={loadStateSnapshot}
                onRemoveState={removeStateSnapshot}
                onSaveBundle={handleSaveBundle}
                onSaveRecipe={handleSaveRecipe}
                onSaveState={handleSaveState}
              />

              <PromptWizardStepContent
                stepMeta={stepMeta}
                tags={stepTags}
                allTags={allTags}
                selectedTagIds={selectedTagIdSet}
                manualNegativeTexts={manualNegativeTexts}
                searchQuery={searchQuery}
                onToggleTag={handleToggleTag}
                onAddNegativePair={toggleManualNegativeText}
                onFocusGroup={recordGroupFocus}
              />
            </Group>

            {/* Next / Previous navigation */}
            <Group
              justify="space-between"
              px="md"
              py="xs"
              style={{
                borderTop: '1px solid var(--mantine-color-default-border)',
                flexShrink: 0,
              }}
            >
              <SwarmButton tone="secondary" emphasis="ghost" onClick={goToPrev} disabled={!canGoPrev}>
                Previous
              </SwarmButton>
              <Text size="sm" c="dimmed">{stepMeta.label} ({currentStepIndex + 1}/{profileStepOrder.length})</Text>
              <SwarmButton tone="secondary" emphasis="ghost" onClick={goToNext} disabled={!canGoNext}>
                Next
              </SwarmButton>
            </Group>

            <PromptWizardPreview
              positivePreview={assembled.positive}
              negativePreview={mergedNegativePreview}
              positiveCount={selectedTags.length}
              negativeCount={mergedNegativePreview ? mergedNegativePreview.split(profile?.tagSeparator ?? ', ').filter(Boolean).length : 0}
              explicitCount={explicitCount}
              profileName={profile?.name ?? 'Unknown profile'}
              profileStepSummary={profileStepSummary}
              healthIssues={promptHealth}
              onApplyToPrompt={handleApplyPrompt}
              onApplyToNegative={handleApplyNegative}
              onClear={clearSelections}
              hasSelection={totalSelected > 0}
            />

            <Box style={{ position: 'absolute', top: 0, right: 0, bottom: 12, zIndex: 8 }}>
              <ResizeHandle
                direction="horizontal"
                onPointerDown={widthPanel.handlePointerDown}
                onNudge={widthPanel.nudgeSize}
                isResizing={widthPanel.isResizing}
              />
            </Box>

            <Box style={{ position: 'absolute', left: 0, right: 12, bottom: 0, zIndex: 8 }}>
              <ResizeHandle
                direction="vertical"
                onPointerDown={heightPanel.handlePointerDown}
                onNudge={heightPanel.nudgeSize}
                isResizing={heightPanel.isResizing}
              />
            </Box>
          </Box>
        )}
      </Modal>
    </>
  );
});
