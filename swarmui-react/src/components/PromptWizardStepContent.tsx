import { memo, useMemo, useState } from 'react';
import { Box, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { SwarmBadge, ElevatedCard } from './ui';
import { PromptWizardTagChip } from './PromptWizardTagChip';
import type { PromptTag, StepMeta } from '../features/promptWizard/types';

interface PromptWizardStepContentProps {
  stepMeta: StepMeta;
  tags: PromptTag[];
  selectedTagIds: Set<string>;
  searchQuery: string;
  onToggleTag: (tagId: string) => void;
}

type SelectionFilter = 'all' | 'selected' | 'unselected';
type SearchMode = 'broad' | 'prefix' | 'exact';
type TagDetailFilter = 'all' | 'single-word' | 'multi-word' | 'negative-capable';

interface TagSection {
  name: string;
  tags: PromptTag[];
}

export const PromptWizardStepContent = memo(function PromptWizardStepContent({
  stepMeta,
  tags,
  selectedTagIds,
  searchQuery,
  onToggleTag,
}: PromptWizardStepContentProps) {
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilter>('all');
  const [searchMode, setSearchMode] = useState<SearchMode>('broad');
  const [tagDetailFilter, setTagDetailFilter] = useState<TagDetailFilter>('all');

  const query = searchQuery.trim().toLowerCase();
  const queryTerms = useMemo(
    () => query.split(/\s+/).filter(Boolean),
    [query]
  );

  const filteredTags = useMemo(() => {
    if (!query) {
      return tags;
    }

    const matchesBroad = (value: string) => {
      const normalizedValue = value.toLowerCase();
      return queryTerms.every((term) => normalizedValue.includes(term));
    };

    const matchesPrefix = (value: string) => {
      const words = value.toLowerCase().split(/[\s,_-]+/).filter(Boolean);
      return queryTerms.every((term) => words.some((word) => word.startsWith(term)));
    };

    const matchesExact = (value: string) => value.toLowerCase() === query;

    return tags.filter((tag) => {
      const candidates = [tag.text, ...(tag.aliases ?? []), tag.subcategory ?? ''];
      if (searchMode === 'exact') {
        return candidates.some(matchesExact);
      }
      if (searchMode === 'prefix') {
        return candidates.some(matchesPrefix);
      }
      return candidates.some(matchesBroad);
    });
  }, [query, queryTerms, searchMode, tags]);

  const selectionCounts = useMemo(() => {
    const selected = filteredTags.filter((tag) => selectedTagIds.has(tag.id)).length;
    const unselected = filteredTags.length - selected;
    return {
      all: filteredTags.length,
      selected,
      unselected,
    };
  }, [filteredTags, selectedTagIds]);

  const selectionFilteredTags = useMemo(() => {
    if (selectionFilter === 'selected') {
      return filteredTags.filter((tag) => selectedTagIds.has(tag.id));
    }
    if (selectionFilter === 'unselected') {
      return filteredTags.filter((tag) => !selectedTagIds.has(tag.id));
    }
    return filteredTags;
  }, [filteredTags, selectedTagIds, selectionFilter]);

  const detailCounts = useMemo(() => {
    const counts = {
      all: selectionFilteredTags.length,
      'single-word': 0,
      'multi-word': 0,
      'negative-capable': 0,
    } as Record<TagDetailFilter, number>;

    for (const tag of selectionFilteredTags) {
      const normalizedText = tag.text.trim();
      const isMultiWord = /[\s,_-]/.test(normalizedText);
      if (isMultiWord) {
        counts['multi-word'] += 1;
      }
      else {
        counts['single-word'] += 1;
      }
      if (tag.negativeText?.trim()) {
        counts['negative-capable'] += 1;
      }
    }

    return counts;
  }, [selectionFilteredTags]);

  const detailFilteredTags = useMemo(() => {
    if (tagDetailFilter === 'single-word') {
      return selectionFilteredTags.filter((tag) => !/[\s,_-]/.test(tag.text.trim()));
    }
    if (tagDetailFilter === 'multi-word') {
      return selectionFilteredTags.filter((tag) => /[\s,_-]/.test(tag.text.trim()));
    }
    if (tagDetailFilter === 'negative-capable') {
      return selectionFilteredTags.filter((tag) => Boolean(tag.negativeText?.trim()));
    }
    return selectionFilteredTags;
  }, [selectionFilteredTags, tagDetailFilter]);

  const sortedSubcategories = useMemo(() => {
    const available = new Set<string>();
    let hasGeneral = false;
    for (const tag of detailFilteredTags) {
      if (tag.subcategory) {
        available.add(tag.subcategory);
      }
      else {
        hasGeneral = true;
      }
    }

    const ordered = stepMeta.subcategories.filter((name) => available.has(name));
    for (const tag of detailFilteredTags) {
      if (tag.subcategory && !ordered.includes(tag.subcategory)) {
        ordered.push(tag.subcategory);
      }
    }
    if (hasGeneral) {
      ordered.unshift('General');
    }
    return ordered;
  }, [detailFilteredTags, stepMeta.subcategories]);

  const subcatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subcat of sortedSubcategories) {
      if (subcat === 'General') {
        counts[subcat] = detailFilteredTags.filter((t) => !t.subcategory).length;
      } else {
        counts[subcat] = detailFilteredTags.filter((t) => t.subcategory === subcat).length;
      }
    }
    return counts;
  }, [detailFilteredTags, sortedSubcategories]);

  const resolvedActiveSubcategory = activeSubcategory && sortedSubcategories.includes(activeSubcategory)
    ? activeSubcategory
    : null;

  const sections = useMemo(() => {
    const sectionNames = resolvedActiveSubcategory ? [resolvedActiveSubcategory] : sortedSubcategories;
    return sectionNames
      .map((sectionName): TagSection => {
        const matchingTags = detailFilteredTags
          .filter((tag) => {
            if (sectionName === 'General') {
              return !tag.subcategory;
            }
            return tag.subcategory === sectionName;
          })
          .sort((left, right) => {
            const leftSelected = selectedTagIds.has(left.id);
            const rightSelected = selectedTagIds.has(right.id);
            if (leftSelected !== rightSelected) {
              return leftSelected ? -1 : 1;
            }
            return left.text.localeCompare(right.text);
          });
        return {
          name: sectionName,
          tags: matchingTags,
        };
      })
      .filter((section) => section.tags.length > 0);
  }, [detailFilteredTags, resolvedActiveSubcategory, selectedTagIds, sortedSubcategories]);

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
      <Box
        px="md"
        py="sm"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          background: `linear-gradient(180deg, color-mix(in srgb, var(--mantine-color-${stepMeta.tone}-light) 55%, transparent), transparent)`,
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Text size="xs" tt="uppercase" fw={700} c={`${stepMeta.tone}.6`}>
                {stepMeta.label}
              </Text>
              <Text size="sm" c="dimmed">
                {query ? 'Search results stay grouped so matching tags are easier to scan.' : stepMeta.description}
              </Text>
            </Stack>
            <SwarmBadge tone={stepMeta.tone} emphasis="soft">
              {selectionCounts.all} visible
            </SwarmBadge>
          </Group>

          <Group gap="xs">
            {(['all', 'selected', 'unselected'] as SelectionFilter[]).map((filterName) => {
              const isActive = selectionFilter === filterName;
              const count = selectionCounts[filterName];
              const label = filterName === 'all'
                ? 'All'
                : filterName === 'selected'
                  ? 'Selected'
                  : 'Available';
              return (
                <SwarmBadge
                  key={filterName}
                  tone={isActive ? stepMeta.tone : 'secondary'}
                  emphasis={isActive ? 'solid' : 'soft'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectionFilter(filterName)}
                >
                  {label} ({count})
                </SwarmBadge>
              );
            })}
          </Group>

          <Group gap="xs">
            {([
              { value: 'all', label: 'All tag types' },
              { value: 'single-word', label: 'Single word' },
              { value: 'multi-word', label: 'Phrase tag' },
              { value: 'negative-capable', label: 'Has negative pair' },
            ] as { value: TagDetailFilter; label: string }[]).map((filterOption) => {
              const isActive = tagDetailFilter === filterOption.value;
              return (
                <SwarmBadge
                  key={filterOption.value}
                  tone={isActive ? stepMeta.tone : 'secondary'}
                  emphasis={isActive ? 'solid' : 'soft'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setTagDetailFilter(filterOption.value)}
                >
                  {filterOption.label} ({detailCounts[filterOption.value]})
                </SwarmBadge>
              );
            })}
          </Group>

          {query && (
            <Group gap="xs">
              {([
                { value: 'broad', label: 'Broad match', hint: 'Match all typed terms anywhere' },
                { value: 'prefix', label: 'Starts with', hint: 'Match the start of words' },
                { value: 'exact', label: 'Exact phrase', hint: 'Only exact tag, alias, or group names' },
              ] as { value: SearchMode; label: string; hint: string }[]).map((mode) => {
                const isActive = searchMode === mode.value;
                return (
                  <SwarmBadge
                    key={mode.value}
                    tone={isActive ? stepMeta.tone : 'secondary'}
                    emphasis={isActive ? 'solid' : 'soft'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSearchMode(mode.value)}
                    title={mode.hint}
                  >
                    {mode.label}
                  </SwarmBadge>
                );
              })}
            </Group>
          )}
        </Stack>
      </Box>

      <Box px="md" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <ScrollArea offsetScrollbars>
          <Group gap="xs" wrap="nowrap">
            <SwarmBadge
              tone={activeSubcategory === null ? stepMeta.tone : 'secondary'}
              emphasis={activeSubcategory === null ? 'solid' : 'soft'}
              style={{ cursor: 'pointer' }}
              onClick={() => setActiveSubcategory(null)}
            >
              All Groups ({selectionCounts.all})
            </SwarmBadge>
            {sortedSubcategories.map((subcat) => {
              const isActive = subcat === resolvedActiveSubcategory;
              const count = subcatCounts[subcat] ?? 0;
              if (count === 0) {
                return null;
              }
              return (
                <SwarmBadge
                  key={subcat}
                  tone={isActive ? stepMeta.tone : 'secondary'}
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
          {sections.length === 0 ? (
            <ElevatedCard elevation="floor" withBorder>
              <Stack align="center" gap="xs" py="xl">
                <Text fw={600}>No tags{query ? ' match your search' : ' match these filters'}</Text>
                <Text size="sm" c="dimmed">
                  {query ? 'Try a different search term or broaden the filters.' : 'Try switching groups or showing available tags.'}
                </Text>
              </Stack>
            </ElevatedCard>
          ) : (
            <Stack gap="md">
              {sections.map((section) => (
                <ElevatedCard
                  key={section.name}
                  elevation="floor"
                  withBorder
                  style={{
                    padding: '14px 16px',
                    borderColor: `color-mix(in srgb, var(--mantine-color-${stepMeta.tone}-filled) 18%, var(--mantine-color-default-border))`,
                  }}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="center">
                      <Group gap="xs" align="center">
                        <SwarmBadge tone={stepMeta.tone} emphasis="soft">
                          {section.name}
                        </SwarmBadge>
                        <Text size="sm" c="dimmed">
                          {section.tags.length} tag{section.tags.length === 1 ? '' : 's'}
                        </Text>
                      </Group>
                      {resolvedActiveSubcategory === null && (
                        <SwarmBadge
                          tone="secondary"
                          emphasis="ghost"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setActiveSubcategory(section.name)}
                        >
                          Focus group
                        </SwarmBadge>
                      )}
                    </Group>
                    <Group gap="xs">
                      {section.tags.map((tag) => (
                        <PromptWizardTagChip
                          key={tag.id}
                          text={tag.text}
                          selected={selectedTagIds.has(tag.id)}
                          onToggle={() => onToggleTag(tag.id)}
                        />
                      ))}
                    </Group>
                  </Stack>
                </ElevatedCard>
              ))}
            </Stack>
          )}
        </Box>
      </ScrollArea>
    </Stack>
  );
});
