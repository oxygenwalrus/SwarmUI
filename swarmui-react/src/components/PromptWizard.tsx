import { memo, useCallback, useMemo, useState } from 'react';
import { Box, Center, Group, Loader, Modal, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconChevronRight, IconSparkles } from '@tabler/icons-react';
import { ElevatedCard, ResizeHandle, SwarmBadge, SwarmButton } from './ui';
import { PromptWizardHeader } from './PromptWizardHeader';
import { PromptWizardSteps } from './PromptWizardSteps';
import { PromptWizardStepContent } from './PromptWizardStepContent';
import { PromptWizardPreview } from './PromptWizardPreview';
import { useResizablePanel } from '../hooks/useResizablePanel';
import { usePromptWizardStore } from '../stores/promptWizardStore';
import { normalizePromptTags } from '../features/promptWizard/normalizeTags';
import { STEP_META, getStepMeta } from '../features/promptWizard/steps';
import { getProfile } from '../features/promptWizard/profiles';
import { assemblePrompt } from '../features/promptWizard/assemble';
import type { BuilderStep, PromptTag } from '../features/promptWizard/types';

interface PromptWizardProps {
  onApplyToPrompt?: (text: string) => void;
  onApplyToNegative?: (text: string) => void;
  compact?: boolean;
}

// Lazy-loaded data
let defaultTagsPromise: Promise<PromptTag[]> | null = null;

function loadDefaultTags(): Promise<PromptTag[]> {
  if (!defaultTagsPromise) {
    defaultTagsPromise = import('../data/promptTags.json').then((m) => normalizePromptTags(m.default as PromptTag[]));
  }
  return defaultTagsPromise;
}

export const PromptWizard = memo(function PromptWizard({
  onApplyToPrompt,
  onApplyToNegative,
  compact = false,
}: PromptWizardProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultTags, setDefaultTags] = useState<PromptTag[]>([]);
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
    activeProfileId,
    activeStep,
    customTags,
    toggleTag,
    clearSelections,
    setActiveStep,
    setActiveProfile,
  } = usePromptWizardStore();

  const handleOpen = useCallback(() => {
    open();
    if (hasLoaded || isLoading) {
      return;
    }
    setIsLoading(true);
    loadDefaultTags()
      .then((tags) => {
        setDefaultTags(tags);
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
  const allTags = useMemo(() => [...defaultTags, ...customTags], [defaultTags, customTags]);

  // When searching, show tags across all steps; otherwise scope to active step
  const hasSearch = searchQuery.trim().length > 0;
  const stepTags = useMemo(
    () => hasSearch ? allTags : allTags.filter((t) => t.step === activeStep),
    [allTags, activeStep, hasSearch]
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

  const handleApplyPrompt = useCallback(() => {
    if (!assembled.positive || !onApplyToPrompt) return;
    onApplyToPrompt(assembled.positive);
    notifications.show({ title: 'Prompt Applied', message: 'Tags added to the prompt.', color: 'teal' });
  }, [assembled.positive, onApplyToPrompt]);

  const handleApplyNegative = useCallback(() => {
    if (!assembled.negative || !onApplyToNegative) return;
    onApplyToNegative(assembled.negative);
    notifications.show({ title: 'Negative Applied', message: 'Negative tags added.', color: 'teal' });
  }, [assembled.negative, onApplyToNegative]);

  const totalSelected = selectedTagIds.length;
  const stepMeta = getStepMeta(activeStep)!;

  // Step navigation
  const profileStepOrder = profile?.stepOrder ?? STEP_META.map((m) => m.step);
  const currentStepIndex = profileStepOrder.indexOf(activeStep);
  const canGoPrev = currentStepIndex > 0;
  const canGoNext = currentStepIndex < profileStepOrder.length - 1;
  const goToPrev = useCallback(() => {
    if (canGoPrev) setActiveStep(profileStepOrder[currentStepIndex - 1]);
  }, [canGoPrev, currentStepIndex, profileStepOrder, setActiveStep]);
  const goToNext = useCallback(() => {
    if (canGoNext) setActiveStep(profileStepOrder[currentStepIndex + 1]);
  }, [canGoNext, currentStepIndex, profileStepOrder, setActiveStep]);

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
              totalSelected={totalSelected}
              onClose={close}
            />

            <PromptWizardSteps
              steps={STEP_META}
              activeStep={activeStep}
              tagCountsByStep={tagCountsByStep}
              onStepClick={setActiveStep}
            />

            <PromptWizardStepContent
              stepMeta={stepMeta}
              tags={stepTags}
              selectedTagIds={selectedTagIdSet}
              searchQuery={searchQuery}
              onToggleTag={toggleTag}
            />

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
              negativePreview={assembled.negative}
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
