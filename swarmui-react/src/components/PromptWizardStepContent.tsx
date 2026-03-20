import { memo, useMemo, useState } from 'react';
import { Box, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { SwarmBadge, SwarmButton, ElevatedCard } from './ui';
import { PromptWizardTagChip } from './PromptWizardTagChip';
import type { PromptTag, PromptPreset, StepMeta } from '../features/promptWizard/types';

interface PromptWizardStepContentProps {
  stepMeta: StepMeta;
  tags: PromptTag[];
  presets: PromptPreset[];
  selectedTagIds: Set<string>;
  searchQuery: string;
  onToggleTag: (tagId: string) => void;
  onApplyPreset: (tagIds: string[]) => void;
}

export const PromptWizardStepContent = memo(function PromptWizardStepContent({
  stepMeta,
  tags,
  presets,
  selectedTagIds,
  searchQuery,
  onToggleTag,
  onApplyPreset,
}: PromptWizardStepContentProps) {
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const query = searchQuery.trim().toLowerCase();

  const filteredTags = useMemo(() => {
    if (!query) return tags;
    return tags.filter(
      (t) =>
        t.text.toLowerCase().includes(query) ||
        t.aliases?.some((a) => a.toLowerCase().includes(query))
    );
  }, [tags, query]);

  // Group tags: selected pinned to top, then by subcategory
  const subcategories = useMemo(() => ['General', ...stepMeta.subcategories], [stepMeta.subcategories]);
  const activeSubcat = activeSubcategory ?? subcategories[0];

  const visibleTags = useMemo(() => {
    if (activeSubcat === 'General') {
      return filteredTags.filter((t) => !t.subcategory);
    }
    return filteredTags.filter((t) => t.subcategory === activeSubcat);
  }, [filteredTags, activeSubcat]);

  // Sort: selected first, then alphabetical
  const sortedTags = useMemo(() => {
    const selected = visibleTags.filter((t) => selectedTagIds.has(t.id));
    const unselected = visibleTags.filter((t) => !selectedTagIds.has(t.id));
    return [...selected, ...unselected];
  }, [visibleTags, selectedTagIds]);

  const subcatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subcat of subcategories) {
      if (subcat === 'General') {
        counts[subcat] = filteredTags.filter((t) => !t.subcategory).length;
      } else {
        counts[subcat] = filteredTags.filter((t) => t.subcategory === subcat).length;
      }
    }
    return counts;
  }, [filteredTags, subcategories]);

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
      {/* Quick-fill presets */}
      {presets.length > 0 && !query && (
        <Box px="md" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <Stack gap="xs">
            <Text size="xs" tt="uppercase" fw={600} c="dimmed">Quick Fill</Text>
            <Group gap="xs">
              {presets.map((preset) => (
                <SwarmButton
                  key={preset.id}
                  tone="secondary"
                  emphasis="soft"
                  size="compact-xs"
                  onClick={() => onApplyPreset(preset.tagIds)}
                >
                  {preset.name}
                </SwarmButton>
              ))}
            </Group>
          </Stack>
        </Box>
      )}

      {/* Subcategory tabs */}
      <Box px="md" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <ScrollArea offsetScrollbars>
          <Group gap="xs" wrap="nowrap">
            {subcategories.map((subcat) => {
              const isActive = subcat === activeSubcat;
              const count = subcatCounts[subcat] ?? 0;
              if (count === 0 && !isActive) return null;
              return (
                <SwarmBadge
                  key={subcat}
                  tone={isActive ? 'primary' : 'secondary'}
                  emphasis={isActive ? 'solid' : 'soft'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveSubcategory(subcat)}
                >
                  {subcat} ({count})
                </SwarmBadge>
              );
            })}
          </Group>
        </ScrollArea>
      </Box>

      {/* Tag grid */}
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        <Box p="md">
          {sortedTags.length === 0 ? (
            <ElevatedCard elevation="floor" withBorder>
              <Stack align="center" gap="xs" py="xl">
                <Text fw={600}>No tags{query ? ' match your search' : ' in this subcategory'}</Text>
                <Text size="sm" c="dimmed">
                  {query ? 'Try a different search term.' : 'Tags will appear here as the library grows.'}
                </Text>
              </Stack>
            </ElevatedCard>
          ) : (
            <Group gap="xs">
              {sortedTags.map((tag) => (
                <PromptWizardTagChip
                  key={tag.id}
                  text={tag.text}
                  selected={selectedTagIds.has(tag.id)}
                  onToggle={() => onToggleTag(tag.id)}
                />
              ))}
            </Group>
          )}
        </Box>
      </ScrollArea>
    </Stack>
  );
});
