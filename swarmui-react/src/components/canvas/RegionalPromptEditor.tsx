import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Stack,
  Group,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  Slider,
  Paper,
  Button,
  Card,
  ScrollArea,
  Switch,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconEye,
  IconEyeOff,
  IconRectangle,
  IconCopy,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BuilderRegionRule } from '../../features/promptBuilder';
import { usePromptBuilderStore } from '../../stores/promptBuilderStore';
import { useCanvasEditorStore } from '../../stores/canvasEditorStore';
import { checkLanguage, applyCorrections } from '../../utils/languageCorrection';
import { autocorrectPromptText } from '../../utils/promptTextTools';
import { registerPromptTargetHandlers, setActivePromptTarget } from '../../utils/promptContextRegistry';
import { SwarmActionIcon } from '../ui';

interface RegionalPromptEditorProps {
  onRegionSelect?: (regionId: string | null) => void;
}

interface RegionItemProps {
  region: BuilderRegionRule;
  index: number;
  total: number;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<BuilderRegionRule>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onPromptFocus: () => void;
  onPromptBlur: () => void;
}

const RegionItem = memo(function RegionItem({
  region,
  index,
  total,
  isActive,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onPromptFocus,
  onPromptBlur,
}: RegionItemProps) {
  const isBackgroundRegion = region.shape === 'background';
  const summary = region.label?.trim()
    || region.prompt.trim().split(/\s+/).slice(0, 3).join(' ')
    || (isBackgroundRegion ? 'Background' : `Region ${index + 1}`);

  return (
    <Card
      p="sm"
      radius="sm"
      style={{
        cursor: 'pointer',
        border: isActive
          ? '2px solid var(--mantine-color-invokeBrand-6)'
          : '1px solid var(--mantine-color-invokeGray-7)',
        backgroundColor: isActive
          ? 'var(--mantine-color-invokeGray-8)'
          : 'var(--mantine-color-invokeGray-9)',
      }}
      onClick={onSelect}
    >
      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <IconRectangle size={16} color="var(--mantine-color-invokeBrand-6)" />
            <Text size="sm" fw={500} c="invokeGray.0">
              {summary}
            </Text>
          </Group>
          <Group gap={2}>
            <Tooltip label="Duplicate">
              <SwarmActionIcon
                size="xs"
                tone="secondary"
                emphasis="ghost"
                label="Duplicate region"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
              >
                <IconCopy size={12} />
              </SwarmActionIcon>
            </Tooltip>
            <Tooltip label="Move up">
              <SwarmActionIcon
                size="xs"
                tone="secondary"
                emphasis="ghost"
                label="Move region up"
                disabled={index === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
              >
                <IconChevronUp size={12} />
              </SwarmActionIcon>
            </Tooltip>
            <Tooltip label="Move down">
              <SwarmActionIcon
                size="xs"
                tone="secondary"
                emphasis="ghost"
                label="Move region down"
                disabled={index === total - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
              >
                <IconChevronDown size={12} />
              </SwarmActionIcon>
            </Tooltip>
            <Tooltip label="Delete">
              <SwarmActionIcon
                size="xs"
                tone="danger"
                emphasis="ghost"
                label="Delete region"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <IconTrash size={12} />
              </SwarmActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <TextInput
          size="xs"
          label="Region Label"
          placeholder={isBackgroundRegion ? 'Background' : 'Character A, Background, Face Fix...'}
          value={region.label ?? ''}
          onChange={(e) => onUpdate({ label: e.currentTarget.value })}
          onClick={(e) => e.stopPropagation()}
        />

        <Textarea
          size="xs"
          label={isBackgroundRegion ? 'Background Prompt' : 'Region Prompt'}
          placeholder={isBackgroundRegion ? 'Describe the background you want...' : 'Describe what this region should contain...'}
          value={region.prompt}
          onChange={(e) => onUpdate({ prompt: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => {
            e.stopPropagation();
            onPromptFocus();
          }}
          onBlur={onPromptBlur}
          spellCheck={true}
          autosize
          minRows={2}
          maxRows={4}
        />

        {!isBackgroundRegion && (
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="invokeGray.4">
                Region Strength
              </Text>
              <Text size="xs" c="invokeGray.3">
                {region.strength.toFixed(2)}
              </Text>
            </Group>
            <Slider
              value={region.strength}
              onChange={(value) => onUpdate({ strength: value })}
              onClick={(e) => e.stopPropagation()}
              min={0}
              max={1}
              step={0.05}
              size="xs"
              color="invokeBrand"
            />
          </Box>
        )}

        {!isBackgroundRegion && (
          <Switch
            label="Use Object Inpaint (<object:...>)"
            checked={region.useInpaint}
            onChange={(e) => onUpdate({ useInpaint: e.currentTarget.checked })}
            onClick={(e) => e.stopPropagation()}
            size="xs"
          />
        )}

        {!isBackgroundRegion && region.useInpaint && (
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="invokeGray.4">
                Inpaint Strength
              </Text>
              <Text size="xs" c="invokeGray.3">
                {region.inpaintStrength.toFixed(2)}
              </Text>
            </Group>
            <Slider
              value={region.inpaintStrength}
              onChange={(value) => onUpdate({ inpaintStrength: value })}
              onClick={(e) => e.stopPropagation()}
              min={0}
              max={1}
              step={0.05}
              size="xs"
              color="invokeBrand"
            />
          </Box>
        )}

        {isBackgroundRegion && (
          <Text size="xs" c="invokeGray.4">
            Uses the backend-supported <code>{'<region:background>'}</code> syntax for scene-wide background cleanup.
          </Text>
        )}

        <Switch
          label="Enabled"
          checked={region.enabled}
          onChange={(e) => onUpdate({ enabled: e.currentTarget.checked })}
          onClick={(e) => e.stopPropagation()}
          size="xs"
        />
      </Stack>
    </Card>
  );
});

export const RegionalPromptEditor = memo(function RegionalPromptEditor({
  onRegionSelect,
}: RegionalPromptEditorProps) {
  const targetIdRef = useRef(`regional-prompt-editor-${Math.random().toString(36).slice(2)}`);
  const containerRef = useRef<HTMLDivElement>(null);
  const regionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [focusedRegionId, setFocusedRegionId] = useState<string | null>(null);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);

  const regions = usePromptBuilderStore((state) => state.regions);
  const addRegion = usePromptBuilderStore((state) => state.addRegion);
  const updateRegion = usePromptBuilderStore((state) => state.updateRegion);
  const removeRegion = usePromptBuilderStore((state) => state.removeRegion);
  const reorderRegions = usePromptBuilderStore((state) => state.reorderRegions);

  const activeRegionId = useCanvasEditorStore((state) => state.activeRegionId);
  const setActiveRegion = useCanvasEditorStore((state) => state.setActiveRegion);
  const showRegions = useCanvasEditorStore((state) => state.showRegions);
  const toggleRegionsVisibility = useCanvasEditorStore((state) => state.toggleRegionsVisibility);

  const handleAutocorrectFocusedRegion = useCallback(() => {
    if (!focusedRegionId) return;
    const region = regions.find(r => r.id === focusedRegionId);
    if (!region) return;

    const corrected = autocorrectPromptText(region.prompt);
    updateRegion(region.id, { prompt: corrected });
  }, [focusedRegionId, regions, updateRegion]);

  const handleGrammarCheckFocusedRegion = useCallback(async () => {
    if (!focusedRegionId || isCheckingGrammar) return;
    const region = regions.find(r => r.id === focusedRegionId);
    if (!region?.prompt.trim()) return;

    setIsCheckingGrammar(true);
    try {
      const result = await checkLanguage(region.prompt);
      const sourceLabel = result.source === 'languagetool-online'
        ? 'online language service'
        : 'offline spell scan';

      if (result.matches.length === 0) {
        notifications.show({
          title: 'Grammar Check',
          message: `No issues found (${sourceLabel}).`,
          color: 'green',
        });
      } else {
        const corrected = applyCorrections(region.prompt, result.matches);
        updateRegion(region.id, { prompt: corrected });
        notifications.show({
          title: 'Grammar Check',
          message: `Fixed ${result.matches.length} issue(s) via ${sourceLabel}`,
          color: 'blue',
        });
      }
    } catch {
      notifications.show({
        title: 'Grammar Check Failed',
        message: 'Language scan failed unexpectedly',
        color: 'red',
      });
    } finally {
      setIsCheckingGrammar(false);
    }
  }, [focusedRegionId, isCheckingGrammar, regions, updateRegion]);

  useEffect(() => {
    const unregister = registerPromptTargetHandlers(targetIdRef.current, {
      onAutocorrectFormat: handleAutocorrectFocusedRegion,
      onGrammarCheck: () => {
        void handleGrammarCheckFocusedRegion();
      },
    });

    return unregister;
  }, [handleAutocorrectFocusedRegion, handleGrammarCheckFocusedRegion]);

  useEffect(() => {
    if (!activeRegionId) {
      return;
    }
    regionRefs.current[activeRegionId]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [activeRegionId]);

  const handleAddRegion = () => {
    const id = addRegion({
      prompt: '',
      strength: 0.5,
      useInpaint: false,
      inpaintStrength: 0.5,
      enabled: true,
    });
    setActiveRegion(id);
    onRegionSelect?.(id);
  };

  const handleSelectRegion = (id: string) => {
    const nextActive = activeRegionId === id ? null : id;
    setActiveRegion(nextActive);
    onRegionSelect?.(nextActive);
  };

  return (
    <Paper p="sm" radius="md" bg="invokeGray.9" ref={containerRef}>
      <Stack gap="md">
        <Group justify="space-between">
          <Text size="sm" fw={500} c="invokeGray.1">
            Regional Prompt Rules
          </Text>
          <Group gap="xs">
            <Tooltip label={showRegions ? 'Hide regions' : 'Show regions'}>
              <SwarmActionIcon
                size="sm"
                tone="secondary"
                emphasis="ghost"
                label={showRegions ? 'Hide regions overlay' : 'Show regions overlay'}
                onClick={toggleRegionsVisibility}
              >
                {showRegions ? <IconEye size={16} /> : <IconEyeOff size={16} />}
              </SwarmActionIcon>
            </Tooltip>
            {regions.length > 0 && (
              <Tooltip label="Remove all regions">
                <SwarmActionIcon
                  size="sm"
                  tone="danger"
                  emphasis="ghost"
                  label="Remove all regions"
                  onClick={() => {
                    for (const region of regions) {
                      removeRegion(region.id);
                    }
                    setActiveRegion(null);
                  }}
                >
                  <IconTrash size={16} />
                </SwarmActionIcon>
              </Tooltip>
            )}
          </Group>
        </Group>

        <Button
          size="xs"
          variant="light"
          leftSection={<IconPlus size={14} />}
          onClick={handleAddRegion}
        >
          Add Box Region
        </Button>

        <Button
          size="xs"
          variant="subtle"
          leftSection={<IconPlus size={14} />}
          onClick={() => {
            const id = addRegion({
              shape: 'background',
              label: 'Background',
              prompt: '',
              enabled: true,
              useInpaint: false,
            });
            setActiveRegion(id);
            onRegionSelect?.(id);
          }}
        >
          Add Background Region
        </Button>

        {regions.length === 0 ? (
          <Box
            p="md"
            style={{
              textAlign: 'center',
              border: '1px dashed var(--mantine-color-invokeGray-7)',
              borderRadius: 8,
            }}
          >
            <Text size="sm" c="invokeGray.4">
              No regions defined.
            </Text>
            <Text size="xs" c="invokeGray.5">
              Use Region tool (R) for boxes, or add a background rule for scene-wide cleanup.
            </Text>
          </Box>
        ) : (
          <ScrollArea h={320} offsetScrollbars>
            <Stack gap="xs">
              <AnimatePresence>
                {regions.map((region, index) => (
                  <motion.div
                    key={region.id}
                    ref={(node: HTMLDivElement | null) => {
                      regionRefs.current[region.id] = node;
                    }}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    <RegionItem
                      region={region}
                      index={index}
                      total={regions.length}
                      isActive={region.id === activeRegionId}
                      onSelect={() => handleSelectRegion(region.id)}
                      onUpdate={(updates) => updateRegion(region.id, updates)}
                      onDelete={() => removeRegion(region.id)}
                      onDuplicate={() => {
                        const duplicateId = addRegion({
                          ...region,
                          id: undefined,
                          label: region.label?.trim() ? `${region.label.trim()} Copy` : '',
                        });
                        setActiveRegion(duplicateId);
                        onRegionSelect?.(duplicateId);
                      }}
                      onMoveUp={() => reorderRegions(index, index - 1)}
                      onMoveDown={() => reorderRegions(index, index + 1)}
                      onPromptFocus={() => {
                        setFocusedRegionId(region.id);
                        setActivePromptTarget(targetIdRef.current);
                      }}
                      onPromptBlur={() => {
                        setTimeout(() => {
                          const activeElement = document.activeElement;
                          if (containerRef.current?.contains(activeElement)) {
                            return;
                          }
                          setFocusedRegionId(null);
                          setActivePromptTarget(null);
                        }, 0);
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </Stack>
          </ScrollArea>
        )}

        {regions.length > 0 && (
          <Text size="xs" c="invokeGray.4">
            Draw rectangles with the Region tool for local rules, or use a background rule for the rest of the scene.
          </Text>
        )}
      </Stack>
    </Paper>
  );
});

export default RegionalPromptEditor;
