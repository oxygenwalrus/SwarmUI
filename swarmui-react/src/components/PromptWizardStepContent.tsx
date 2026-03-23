import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Accordion, Box, Group, ScrollArea, Stack, Text } from '@mantine/core';
import { SwarmBadge, ElevatedCard } from './ui';
import { PromptWizardTagChip } from './PromptWizardTagChip';
import { buildNegativePairCandidates, buildRecommendedGroups, buildStepGuidance } from '../features/promptWizard/wizardInsights';
import type { BuilderStep, PromptTag, StepMeta } from '../features/promptWizard/types';

interface PromptWizardStepContentProps {
  stepMeta: StepMeta;
  tags: PromptTag[];
  allTags: PromptTag[];
  selectedTagIds: Set<string>;
  manualNegativeTexts: string[];
  searchQuery: string;
  onToggleTag: (tagId: string) => void;
  onAddNegativePair: (text: string) => void;
  onFocusGroup: (groupKey: string) => void;
}

type SelectionFilter = 'all' | 'selected' | 'unselected';
type SearchMode = 'broad' | 'prefix' | 'exact';

interface MinorGroup {
  name: string;
  order: number;
  tags: PromptTag[];
  wordBuckets: WordBucket[];
}

interface TagGroup {
  name: string;
  description: string;
  tone: StepMeta['tone'] | 'secondary' | 'warning';
  order: number;
  count: number;
  minorGroups: MinorGroup[];
}

interface TagSection {
  name: string;
  groups: TagGroup[];
}

interface WordBucket {
  key: string;
  label: string;
  tags: PromptTag[];
}

const WORD_GROUP_STOP_WORDS = new Set([
  'and', 'the', 'with', 'from', 'into', 'onto', 'over', 'under', 'through', 'style', 'lighting', 'light',
  'scene', 'setting', 'shot', 'view', 'focus', 'pose', 'position', 'mood', 'detail', 'details', 'quality',
  'render', 'rendering', 'group', 'subject', 'subjects', 'look', 'looks', 'color', 'colors', 'effect', 'effects',
  'body', 'face', 'hair', 'eyes', 'clothes', 'clothing', 'art', 'design', 'background', 'atmosphere',
]);

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function tokenizeWords(text: string): string[] {
  return Array.from(new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((part) => part.trim())
      .filter((part) => part.length >= 4 && !WORD_GROUP_STOP_WORDS.has(part) && !/^\d+$/.test(part))
  ));
}

function buildWordBuckets(groupKey: string, tags: PromptTag[]): WordBucket[] {
  if (tags.length < 14) {
    return [];
  }

  const tokenCounts = new Map<string, number>();
  const tagTokens = new Map<string, string[]>();

  for (const tag of tags) {
    const tokens = tokenizeWords(tag.text);
    tagTokens.set(tag.id, tokens);
    for (const token of tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }

  const selectedTokens = Array.from(tokenCounts.entries())
    .filter(([, count]) => count >= 3 && count < tags.length)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 6)
    .map(([token]) => token);

  if (selectedTokens.length < 2) {
    return [];
  }

  const grouped = new Map<string, PromptTag[]>();
  for (const token of selectedTokens) {
    grouped.set(token, []);
  }
  const remainder: PromptTag[] = [];

  for (const tag of tags) {
    const tokens = tagTokens.get(tag.id) ?? [];
    const matchingToken = selectedTokens.find((token) => tokens.includes(token));
    if (matchingToken) {
      grouped.get(matchingToken)?.push(tag);
    }
    else {
      remainder.push(tag);
    }
  }

  const buckets = selectedTokens
    .map((token) => ({
      key: `${groupKey}:${token}`,
      label: toTitleCase(token),
      tags: (grouped.get(token) ?? []).sort((left, right) => left.text.localeCompare(right.text)),
    }))
    .filter((bucket) => bucket.tags.length >= 2);

  if (remainder.length >= 2) {
    buckets.push({
      key: `${groupKey}:other`,
      label: 'Other Words',
      tags: remainder.sort((left, right) => left.text.localeCompare(right.text)),
    });
  }

  return buckets.length >= 2 ? buckets : [];
}

const STEP_GROUP_META: Record<BuilderStep, Record<string, { description: string; tone: StepMeta['tone'] | 'secondary' | 'warning'; order: number }>> = {
  subject: {
    'People & Roles': { description: 'Human-led subjects, professions, classes, and archetypes.', tone: 'info', order: 10 },
    'Creatures & Beings': { description: 'Animals, hybrids, mythic beings, and monsters.', tone: 'warning', order: 20 },
    'Objects & Props': { description: 'Weapons, tools, artifacts, vehicles, and object subjects.', tone: 'secondary', order: 30 },
    'Scenes & Themes': { description: 'Scene-led concepts, narrative themes, and content framing.', tone: 'secondary', order: 40 },
    'Explicit Content': { description: 'Adult tags, erotic concepts, and explicit content framing.', tone: 'danger', order: 50 },
  },
  appearance: {
    'Face & Hair': { description: 'Hair, eyes, facial styling, and head details.', tone: 'warning', order: 10 },
    'Body & Silhouette': { description: 'Build, proportions, skin, curves, and body finish.', tone: 'warning', order: 20 },
    'Clothing & Uniforms': { description: 'Outfits, uniforms, intimate wear, costumes, and armor.', tone: 'secondary', order: 30 },
    'Accessories & Finish': { description: 'Footwear, jewelry, headwear, and worn finishing details.', tone: 'secondary', order: 40 },
    'Explicit Appearance': { description: 'Nudity, revealing details, and adult appearance tags.', tone: 'danger', order: 50 },
  },
  action: {
    'Framing & View': { description: 'Shot framing, crop, point of view, and camera direction.', tone: 'success', order: 10 },
    'Pose & Stance': { description: 'Static pose families, posture, and presenting body language.', tone: 'warning', order: 20 },
    'Motion & Energy': { description: 'Locomotion, action beats, and movement-driven language.', tone: 'secondary', order: 30 },
    'Interaction & Expression': { description: 'Gestures, contact, and emotional or reactive cues.', tone: 'secondary', order: 40 },
    'Explicit Actions': { description: 'Adult interactions, intimacy, and explicit action tags.', tone: 'danger', order: 50 },
  },
  setting: {
    'Composition & Camera': { description: 'Camera language, shot construction, and perspective.', tone: 'primary', order: 10 },
    'Architecture & Urban': { description: 'Indoor spaces, city locations, travel spots, and interiors.', tone: 'warning', order: 20 },
    'Nature & Outdoor': { description: 'Landscape, terrain, coast, gardens, weather, and seasons.', tone: 'secondary', order: 30 },
    'Fantasy & Specialty': { description: 'Mythic, haunted, sacred, royal, and futuristic environments.', tone: 'secondary', order: 40 },
    'Scenes & Concepts': { description: 'Scene ideas, subject emphasis, scale cues, and conceptual framing.', tone: 'info', order: 50 },
  },
  style: {
    'Medium & Rendering': { description: 'Render medium, realism, digital production, and craft.', tone: 'danger', order: 10 },
    'Aesthetic & Genre': { description: 'Genre language, graphic aesthetics, retro looks, and mood.', tone: 'warning', order: 20 },
    'Artists & References': { description: 'Named artists, studios, franchises, and direct style references.', tone: 'secondary', order: 30 },
    'Surface & Finish': { description: 'Texture, color finish, abstract polish, and decorative treatment.', tone: 'secondary', order: 40 },
  },
  atmosphere: {
    Lighting: { description: 'Light quality, temperature, and illumination mood.', tone: 'warning', order: 10 },
    'Mood & Emotion': { description: 'Emotional tone, intimacy, tension, calm, and scene feeling.', tone: 'warning', order: 20 },
    'Color & Palette': { description: 'Palette shaping, stylized color direction, and tonal bias.', tone: 'secondary', order: 30 },
    'Scene Effects': { description: 'Fog, steam, particles, glow, and environmental atmosphere.', tone: 'secondary', order: 40 },
    'Intimacy & Explicit Tone': { description: 'Seductive, private, and adult-coded mood language.', tone: 'danger', order: 50 },
  },
  quality: {
    'Positive Quality': { description: 'Quality boosters, detail cues, and positive render guidance.', tone: 'secondary', order: 10 },
    'Cleanup & Negative': { description: 'Artifact cleanup, anatomy correction, and negative prompt cues.', tone: 'warning', order: 20 },
    Refinement: { description: 'Extra polish and prompt refinement helpers.', tone: 'secondary', order: 30 },
  },
};

function getGroupMeta(step: BuilderStep, groupName: string, stepTone: StepMeta['tone']) {
  if (groupName === 'Selected') {
    return {
      description: 'Tags you have already chosen in this section.',
      tone: stepTone,
      order: 0,
    };
  }

  return STEP_GROUP_META[step][groupName] ?? {
    description: 'Additional tags that can help round out this section.',
    tone: 'secondary',
    order: 90,
  };
}

export const PromptWizardStepContent = memo(function PromptWizardStepContent({
  stepMeta,
  tags,
  allTags,
  selectedTagIds,
  manualNegativeTexts,
  searchQuery,
  onToggleTag,
  onAddNegativePair,
  onFocusGroup,
}: PromptWizardStepContentProps) {
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [activeMajorGroup, setActiveMajorGroup] = useState<string | null>(null);
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilter>('all');
  const [searchMode, setSearchMode] = useState<SearchMode>('broad');
  const [openPanels, setOpenPanels] = useState<string[]>(['guided-composition']);
  const [activeWordBuckets, setActiveWordBuckets] = useState<Record<string, string | null>>({});
  const initializedPanelsRef = useRef(false);

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
      const candidates = [
        tag.text,
        ...(tag.aliases ?? []),
        tag.subcategory ?? '',
        tag.majorGroup ?? '',
        tag.minorGroup ?? '',
      ];
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

  const sortedSubcategories = useMemo(() => {
    const available = new Set<string>();
    let hasGeneral = false;
    for (const tag of selectionFilteredTags) {
      if (tag.subcategory) {
        available.add(tag.subcategory);
      }
      else {
        hasGeneral = true;
      }
    }

    const ordered = stepMeta.subcategories.filter((name) => available.has(name));
    for (const tag of selectionFilteredTags) {
      if (tag.subcategory && !ordered.includes(tag.subcategory)) {
        ordered.push(tag.subcategory);
      }
    }
    if (hasGeneral) {
      ordered.unshift('General');
    }
    return ordered;
  }, [selectionFilteredTags, stepMeta.subcategories]);

  const subcatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subcat of sortedSubcategories) {
      counts[subcat] = subcat === 'General'
        ? selectionFilteredTags.filter((tag) => !tag.subcategory).length
        : selectionFilteredTags.filter((tag) => tag.subcategory === subcat).length;
    }
    return counts;
  }, [selectionFilteredTags, sortedSubcategories]);

  const resolvedActiveSubcategory = activeSubcategory && sortedSubcategories.includes(activeSubcategory)
    ? activeSubcategory
    : null;

  const selectedTags = useMemo(
    () => allTags.filter((tag) => selectedTagIds.has(tag.id)),
    [allTags, selectedTagIds]
  );

  const guidanceSets = useMemo(
    () => buildStepGuidance(stepMeta, allTags, selectionFilteredTags, selectedTags, selectedTagIds),
    [allTags, selectedTagIds, selectedTags, selectionFilteredTags, stepMeta]
  );

  const recommendedGroups = useMemo(
    () => buildRecommendedGroups(selectionFilteredTags.filter((tag) => tag.step === stepMeta.step), selectedTagIds),
    [selectedTagIds, selectionFilteredTags, stepMeta.step]
  );

  const negativePairCandidates = useMemo(
    () => buildNegativePairCandidates(selectedTags.filter((tag) => tag.step === stepMeta.step), manualNegativeTexts),
    [manualNegativeTexts, selectedTags, stepMeta.step]
  );

  const sections = useMemo(() => {
    const sectionNames = resolvedActiveSubcategory ? [resolvedActiveSubcategory] : sortedSubcategories;
    return sectionNames
      .map((sectionName): TagSection => {
        const matchingTags = selectionFilteredTags
          .filter((tag) => {
            if (sectionName === 'General') {
              return !tag.subcategory;
            }
            return tag.subcategory === sectionName;
          })
          .sort((left, right) => {
            if ((left.groupOrder ?? 999) !== (right.groupOrder ?? 999)) {
              return (left.groupOrder ?? 999) - (right.groupOrder ?? 999);
            }
            if ((left.minorOrder ?? 999) !== (right.minorOrder ?? 999)) {
              return (left.minorOrder ?? 999) - (right.minorOrder ?? 999);
            }
            return left.text.localeCompare(right.text);
          });

        const selectedTags = matchingTags.filter((tag) => selectedTagIds.has(tag.id));
        const remainingTags = matchingTags.filter((tag) => !selectedTagIds.has(tag.id));
        const majorGroups = new Map<string, PromptTag[]>();

        for (const tag of remainingTags) {
          const key = tag.majorGroup ?? 'More Options';
          const bucket = majorGroups.get(key) ?? [];
          bucket.push(tag);
          majorGroups.set(key, bucket);
        }

        const groups: TagGroup[] = [];

        if (selectedTags.length > 0) {
          groups.push({
            name: 'Selected',
            description: 'Tags you have already chosen in this section.',
            tone: stepMeta.tone,
            order: 0,
            count: selectedTags.length,
            minorGroups: [
              {
                name: 'Chosen Tags',
                order: 0,
                tags: selectedTags.sort((left, right) => left.text.localeCompare(right.text)),
              },
            ],
          });
        }

        for (const [groupName, groupTags] of majorGroups.entries()) {
          const groupMeta = getGroupMeta(stepMeta.step, groupName, stepMeta.tone);
          const minorGroupsMap = new Map<string, PromptTag[]>();

          for (const tag of groupTags) {
            const minorKey = tag.minorGroup ?? 'General';
            const bucket = minorGroupsMap.get(minorKey) ?? [];
            bucket.push(tag);
            minorGroupsMap.set(minorKey, bucket);
          }

          const minorGroups = Array.from(minorGroupsMap.entries())
            .map(([minorName, minorTags]): MinorGroup => ({
              name: minorName,
              order: Math.min(...minorTags.map((tag) => tag.minorOrder ?? 999)),
              tags: minorTags.sort((left, right) => left.text.localeCompare(right.text)),
              wordBuckets: buildWordBuckets(`${sectionName}:${groupName}:${minorName}`, minorTags),
            }))
            .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));

          groups.push({
            name: groupName,
            description: groupMeta.description,
            tone: groupMeta.tone,
            order: groupMeta.order,
            count: groupTags.length,
            minorGroups,
          });
        }

        return {
          name: sectionName,
          groups: groups.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name)),
        };
      })
      .filter((section) => section.groups.length > 0);
  }, [resolvedActiveSubcategory, selectedTagIds, selectionFilteredTags, sortedSubcategories, stepMeta]);

  const majorGroupTabs = useMemo(() => {
    const counts = new Map<string, { count: number; tone: TagGroup['tone']; order: number }>();
    for (const section of sections) {
      for (const group of section.groups) {
        const existing = counts.get(group.name);
        if (existing) {
          existing.count += group.count;
        }
        else {
          counts.set(group.name, { count: group.count, tone: group.tone, order: group.order });
        }
      }
    }
    return Array.from(counts.entries())
      .map(([name, meta]) => ({ name, count: meta.count, tone: meta.tone, order: meta.order }))
      .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name));
  }, [sections]);

  const resolvedActiveMajorGroup = activeMajorGroup && majorGroupTabs.some((group) => group.name === activeMajorGroup)
    ? activeMajorGroup
    : null;

  const filteredSections = useMemo(() => {
    if (!resolvedActiveMajorGroup) {
      return sections;
    }
    return sections
      .map((section) => ({
        ...section,
        groups: section.groups.filter((group) => group.name === resolvedActiveMajorGroup),
      }))
      .filter((section) => section.groups.length > 0);
  }, [resolvedActiveMajorGroup, sections]);

  useEffect(() => {
    const nextSectionValues = filteredSections.map((section) => `section:${section.name}`);
    setOpenPanels((current) => {
      if (!initializedPanelsRef.current) {
        initializedPanelsRef.current = true;
        return Array.from(new Set(['guided-composition', ...nextSectionValues]));
      }
      const merged = [...current];
      for (const value of nextSectionValues) {
        if (!merged.includes(value)) {
          merged.push(value);
        }
      }
      return merged;
    });
  }, [filteredSections]);

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Box
        px="lg"
        py="md"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          background: `linear-gradient(180deg, color-mix(in srgb, var(--mantine-color-${stepMeta.tone}-light) 55%, transparent), transparent)`,
          flexShrink: 0,
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Stack gap={4}>
              <Text size="sm" tt="uppercase" fw={700} c={`${stepMeta.tone}.6`}>
                {stepMeta.label}
              </Text>
              <Text size="md" c="dimmed">
                {query ? 'Search results stay grouped so matching tags are easier to scan.' : stepMeta.description}
              </Text>
            </Stack>
            <SwarmBadge tone={stepMeta.tone} emphasis="soft" size="lg">
              {selectionCounts.all} visible
            </SwarmBadge>
          </Group>

          <Group gap="xs">
            {(['all', 'selected', 'unselected'] as SelectionFilter[]).map((filterName) => {
              const isActive = selectionFilter === filterName;
              const count = selectionCounts[filterName];
              const label = filterName === 'all' ? 'All' : filterName === 'selected' ? 'Selected' : 'Available';
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

      <Box px="lg" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}>
        <ScrollArea offsetScrollbars>
          <Group gap="xs" wrap="nowrap">
            <SwarmBadge
              tone={resolvedActiveSubcategory === null ? stepMeta.tone : 'secondary'}
              emphasis={resolvedActiveSubcategory === null ? 'solid' : 'soft'}
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
                  onClick={() => {
                    setActiveSubcategory(subcat);
                    onFocusGroup(`${stepMeta.label}: ${subcat}`);
                  }}
                >
                  {subcat} ({count})
                </SwarmBadge>
              );
            })}
          </Group>
        </ScrollArea>
      </Box>

      {majorGroupTabs.length > 0 && (
        <Box px="lg" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}>
          <ScrollArea offsetScrollbars>
            <Group gap="xs" wrap="nowrap">
              <SwarmBadge
                tone={resolvedActiveMajorGroup === null ? stepMeta.tone : 'secondary'}
                emphasis={resolvedActiveMajorGroup === null ? 'solid' : 'soft'}
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveMajorGroup(null)}
              >
                All Major Groups ({majorGroupTabs.reduce((total, group) => total + group.count, 0)})
              </SwarmBadge>
              {majorGroupTabs.map((group) => (
                <SwarmBadge
                  key={group.name}
                  tone={resolvedActiveMajorGroup === group.name ? group.tone : 'secondary'}
                  emphasis={resolvedActiveMajorGroup === group.name ? 'solid' : 'soft'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setActiveMajorGroup(group.name);
                    onFocusGroup(`${stepMeta.label}: ${group.name}`);
                  }}
                >
                  {group.name} ({group.count})
                </SwarmBadge>
              ))}
            </Group>
          </ScrollArea>
        </Box>
      )}

      <Box
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          height: '100%',
          maxHeight: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
        }}
      >
        <Box p="lg">
          <Stack gap="lg">
            {(guidanceSets.length > 0 || recommendedGroups.length > 0 || negativePairCandidates.length > 0) && (
              <Accordion
                multiple
                value={openPanels}
                onChange={setOpenPanels}
                variant="separated"
              >
                <Accordion.Item value="guided-composition">
                  <Accordion.Control>
                    <Group justify="space-between" align="center" wrap="nowrap" style={{ width: '100%' }}>
                      <Text fw={700} size="lg">Guided Composition</Text>
                      <SwarmBadge tone={stepMeta.tone} emphasis="soft">
                        {stepMeta.label}
                      </SwarmBadge>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <ElevatedCard elevation="floor" withBorder>
                      <Stack gap="md">
                        {recommendedGroups.length > 0 && (
                          <Stack gap="xs">
                            <Text fw={600} size="sm">Recommended next groups</Text>
                            <Group gap="xs">
                              {recommendedGroups.map((group) => (
                                <SwarmBadge
                                  key={group}
                                  tone="secondary"
                                  emphasis="soft"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => {
                                    setActiveMajorGroup(group);
                                    onFocusGroup(`${stepMeta.label}: ${group}`);
                                  }}
                                >
                                  {group}
                                </SwarmBadge>
                              ))}
                            </Group>
                          </Stack>
                        )}

                        {negativePairCandidates.length > 0 && (
                          <Stack gap="xs">
                            <Text fw={600} size="sm">Negative pair ready</Text>
                            <Group gap="xs">
                              {negativePairCandidates.slice(0, 6).map((tag) => (
                                <SwarmBadge
                                  key={`${tag.id}-negative`}
                                  tone="warning"
                                  emphasis="soft"
                                  style={{ cursor: 'pointer' }}
                                  onClick={() => tag.negativeText && onAddNegativePair(tag.negativeText)}
                                >
                                  {tag.text} {'->'} {tag.negativeText}
                                </SwarmBadge>
                              ))}
                            </Group>
                          </Stack>
                        )}

                        <Stack gap="sm">
                          {guidanceSets.map((set) => (
                            <Box
                              key={set.title}
                              p="sm"
                              style={{
                                borderRadius: 'var(--mantine-radius-md)',
                                border: '1px solid var(--mantine-color-default-border)',
                                background: 'color-mix(in srgb, var(--elevation-paper) 86%, transparent)',
                              }}
                            >
                              <Stack gap="xs">
                                <Text fw={600} size="sm">{set.title}</Text>
                                <Text size="sm" c="dimmed">{set.description}</Text>
                                <Group gap="sm">
                                  {set.tags.map((tag) => (
                                    <PromptWizardTagChip
                                      key={`guided-${set.title}-${tag.id}`}
                                      text={tag.text}
                                      selected={selectedTagIds.has(tag.id)}
                                      onToggle={() => onToggleTag(tag.id)}
                                    />
                                  ))}
                                </Group>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </Stack>
                    </ElevatedCard>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            )}

            {filteredSections.length === 0 ? (
              <ElevatedCard elevation="floor" withBorder>
                <Stack align="center" gap="sm" py="xl">
                  <Text fw={600} size="lg">No tags{query ? ' match your search' : ' match these filters'}</Text>
                  <Text size="md" c="dimmed">
                    {query ? 'Try a different search term or broaden the filters.' : 'Try switching groups or showing available tags.'}
                  </Text>
                </Stack>
              </ElevatedCard>
            ) : (
              <Accordion
                multiple
                value={openPanels}
                onChange={setOpenPanels}
                variant="separated"
              >
                {filteredSections.map((section) => (
                  <Accordion.Item key={section.name} value={`section:${section.name}`}>
                    <Accordion.Control>
                      <Group justify="space-between" align="center" wrap="wrap" gap="sm" style={{ width: '100%' }}>
                        <Group gap="xs" align="center">
                          <SwarmBadge tone={stepMeta.tone} emphasis="soft" size="lg">
                            {section.name}
                          </SwarmBadge>
                          <Text size="md" c="dimmed">
                            {section.groups.reduce((total, group) => total + group.count, 0)} tag{section.groups.reduce((total, group) => total + group.count, 0) === 1 ? '' : 's'}
                          </Text>
                        </Group>
                        {resolvedActiveSubcategory === null && (
                          <SwarmBadge
                            tone="secondary"
                            emphasis="ghost"
                            style={{ cursor: 'pointer' }}
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveSubcategory(section.name);
                              onFocusGroup(`${stepMeta.label}: ${section.name}`);
                            }}
                          >
                            Focus group
                          </SwarmBadge>
                        )}
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <ElevatedCard
                        elevation="floor"
                        withBorder
                        style={{
                          padding: '18px 20px',
                          borderColor: `color-mix(in srgb, var(--mantine-color-${stepMeta.tone}-filled) 18%, var(--mantine-color-default-border))`,
                        }}
                      >
                        <Stack gap="md">
                          {section.groups.map((group) => (
                            <Box
                              key={`${section.name}-${group.name}`}
                              p="md"
                              style={{
                                borderRadius: 'var(--mantine-radius-md)',
                                background: `color-mix(in srgb, var(--mantine-color-${group.tone}-light) 50%, transparent)`,
                                border: `1px solid color-mix(in srgb, var(--mantine-color-${group.tone}-filled) 14%, var(--mantine-color-default-border))`,
                              }}
                            >
                              <Stack gap="sm">
                                <Group justify="space-between" align="flex-start" gap="sm" wrap="wrap">
                                  <Group gap="xs" align="center">
                                    <SwarmBadge tone={group.tone} emphasis="soft" size="lg">
                                      {group.name}
                                    </SwarmBadge>
                                    <Text size="md" c="dimmed">
                                      {group.count}
                                    </Text>
                                  </Group>
                                  <Text size="sm" c="dimmed" style={{ flex: '1 1 280px', maxWidth: 420 }}>
                                    {group.description}
                                  </Text>
                                </Group>

                                <Stack gap="sm">
                                  {group.minorGroups.map((minorGroup) => (
                                    (() => {
                                      const minorGroupKey = `${section.name}:${group.name}:${minorGroup.name}`;
                                      const activeWordBucket = activeWordBuckets[minorGroupKey] ?? null;
                                      const visibleWordBuckets = activeWordBucket
                                        ? minorGroup.wordBuckets.filter((bucket) => bucket.key === activeWordBucket)
                                        : minorGroup.wordBuckets;

                                      return (
                                        <Box
                                          key={`${group.name}-${minorGroup.name}`}
                                          p="sm"
                                          style={{
                                            borderRadius: 'var(--mantine-radius-sm)',
                                            background: 'color-mix(in srgb, var(--elevation-paper) 86%, transparent)',
                                            border: '1px solid color-mix(in srgb, var(--mantine-color-default-border) 88%, transparent)',
                                          }}
                                        >
                                          <Stack gap="xs">
                                            <Group justify="space-between" align="center">
                                              <Text size="sm" fw={700}>
                                                {minorGroup.name}
                                              </Text>
                                              <Text size="sm" c="dimmed">
                                                {minorGroup.tags.length}
                                              </Text>
                                            </Group>

                                            {minorGroup.wordBuckets.length > 0 && (
                                              <Stack gap="xs">
                                                <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                                                  <Text size="xs" fw={700} c="dimmed">
                                                    Direct word groups
                                                  </Text>
                                                  <Text size="xs" c="dimmed">
                                                    Large group split from actual tag wording
                                                  </Text>
                                                </Group>
                                                <Group gap="xs">
                                                  <SwarmBadge
                                                    tone={activeWordBucket === null ? stepMeta.tone : 'secondary'}
                                                    emphasis={activeWordBucket === null ? 'solid' : 'soft'}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => setActiveWordBuckets((current) => ({ ...current, [minorGroupKey]: null }))}
                                                  >
                                                    All words ({minorGroup.tags.length})
                                                  </SwarmBadge>
                                                  {minorGroup.wordBuckets.map((bucket) => (
                                                    <SwarmBadge
                                                      key={bucket.key}
                                                      tone={activeWordBucket === bucket.key ? stepMeta.tone : 'secondary'}
                                                      emphasis={activeWordBucket === bucket.key ? 'solid' : 'soft'}
                                                      style={{ cursor: 'pointer' }}
                                                      onClick={() => setActiveWordBuckets((current) => ({ ...current, [minorGroupKey]: bucket.key }))}
                                                    >
                                                      {bucket.label} ({bucket.tags.length})
                                                    </SwarmBadge>
                                                  ))}
                                                </Group>
                                              </Stack>
                                            )}

                                            {minorGroup.wordBuckets.length > 0 ? (
                                              <Stack gap="sm">
                                                {visibleWordBuckets.map((bucket) => (
                                                  <Box
                                                    key={bucket.key}
                                                    p="sm"
                                                    style={{
                                                      borderRadius: 'var(--mantine-radius-md)',
                                                      background: `color-mix(in srgb, var(--mantine-color-${group.tone}-light) 28%, transparent)`,
                                                      border: `1px solid color-mix(in srgb, var(--mantine-color-${group.tone}-filled) 12%, var(--mantine-color-default-border))`,
                                                    }}
                                                  >
                                                    <Stack gap="xs">
                                                      <Group justify="space-between" align="center">
                                                        <SwarmBadge tone={group.tone} emphasis="soft">
                                                          {bucket.label}
                                                        </SwarmBadge>
                                                        <Text size="sm" c="dimmed">
                                                          {bucket.tags.length}
                                                        </Text>
                                                      </Group>
                                                      <Group gap="sm">
                                                        {bucket.tags.map((tag) => (
                                                          <PromptWizardTagChip
                                                            key={tag.id}
                                                            text={tag.text}
                                                            selected={selectedTagIds.has(tag.id)}
                                                            onToggle={() => onToggleTag(tag.id)}
                                                          />
                                                        ))}
                                                      </Group>
                                                    </Stack>
                                                  </Box>
                                                ))}
                                              </Stack>
                                            ) : (
                                              <Group gap="sm">
                                                {minorGroup.tags.map((tag) => (
                                                  <PromptWizardTagChip
                                                    key={tag.id}
                                                    text={tag.text}
                                                    selected={selectedTagIds.has(tag.id)}
                                                    onToggle={() => onToggleTag(tag.id)}
                                                  />
                                                ))}
                                              </Group>
                                            )}
                                          </Stack>
                                        </Box>
                                      );
                                    })()
                                  ))}
                                </Stack>
                              </Stack>
                            </Box>
                          ))}
                        </Stack>
                      </ElevatedCard>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
});
