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

interface TagGroup {
  name: string;
  description: string;
  tone: StepMeta['tone'] | 'secondary' | 'warning';
  tags: PromptTag[];
}

interface TagSection {
  name: string;
  groups: TagGroup[];
}

interface GroupDefinition {
  name: string;
  description: string;
  tone: StepMeta['tone'] | 'secondary' | 'warning';
  match: (tag: PromptTag, normalizedText: string) => boolean;
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function getGroupDefinitions(stepMeta: StepMeta): GroupDefinition[] {
  if (stepMeta.step === 'subject') {
    return [
      {
        name: 'People & Roles',
        description: 'Characters, professions, and person-led subjects.',
        tone: stepMeta.tone,
        match: (_, text) => includesAny(text, ['girl', 'boy', 'woman', 'man', 'person', 'character', 'hero', 'villain', 'princess', 'queen', 'knight', 'warrior', 'nurse', 'maid']),
      },
      {
        name: 'Creatures & Beings',
        description: 'Animals, monsters, and fantasy beings.',
        tone: 'warning',
        match: (_, text) => includesAny(text, ['cat', 'dog', 'wolf', 'fox', 'bird', 'dragon', 'demon', 'angel', 'monster', 'creature', 'beast', 'succubus', 'elf']),
      },
      {
        name: 'Objects & Props',
        description: 'Items, artifacts, and object-focused prompts.',
        tone: 'secondary',
        match: (_, text) => includesAny(text, ['sword', 'weapon', 'car', 'vehicle', 'chair', 'book', 'device', 'artifact', 'object', 'flower', 'food']),
      },
      {
        name: 'Scenes & Concepts',
        description: 'Broader scene ideas and concept-led subjects.',
        tone: 'secondary',
        match: () => true,
      },
    ];
  }

  if (stepMeta.step === 'appearance') {
    return [
      {
        name: 'Face & Hair',
        description: 'Hair, face, eyes, and head styling details.',
        tone: stepMeta.tone,
        match: (_, text) => includesAny(text, ['hair', 'bang', 'ponytail', 'braid', 'eye', 'eyelash', 'lip', 'smile', 'face', 'makeup', 'ear', 'horn']),
      },
      {
        name: 'Body & Silhouette',
        description: 'Body shape, figure, and form cues.',
        tone: 'warning',
        match: (_, text) => includesAny(text, ['body', 'waist', 'hips', 'legs', 'thigh', 'breast', 'abs', 'muscular', 'slim', 'curvy', 'tall', 'petite']),
      },
      {
        name: 'Clothing & Uniforms',
        description: 'Apparel, outfits, costumes, and uniforms.',
        tone: 'secondary',
        match: (_, text) => includesAny(text, ['dress', 'shirt', 'skirt', 'jacket', 'uniform', 'outfit', 'armor', 'swimsuit', 'bikini', 'corset', 'robe', 'coat', 'leotard']),
      },
      {
        name: 'Accessories & Finish',
        description: 'Footwear, jewelry, props worn, and finishing details.',
        tone: 'secondary',
        match: () => true,
      },
    ];
  }

  if (stepMeta.step === 'action') {
    return [
      {
        name: 'Framing & View',
        description: 'Camera framing, shot type, and point of view.',
        tone: stepMeta.tone,
        match: (_, text) => includesAny(text, ['portrait', 'headshot', 'close-up', 'full body', 'upper body', 'profile view', 'back view', 'pov', 'shot', 'view', 'angle', 'focus']),
      },
      {
        name: 'Pose & Stance',
        description: 'Static poses, posture, and stance language.',
        tone: 'warning',
        match: (_, text) => includesAny(text, ['standing', 'sitting', 'kneeling', 'reclining', 'pose', 'stance', 'arms crossed', 'hand on hip', 'looking back', 'seated']),
      },
      {
        name: 'Motion & Energy',
        description: 'Movement, motion, and active body energy.',
        tone: 'secondary',
        match: (_, text) => includesAny(text, ['walking', 'running', 'jumping', 'movement', 'motion', 'dynamic', 'airborne', 'fighting', 'combat', 'action']),
      },
      {
        name: 'Interaction & Expression',
        description: 'Gestures, emotional action, and interactive behavior.',
        tone: 'secondary',
        match: () => true,
      },
    ];
  }

  if (stepMeta.step === 'setting') {
    return [
      {
        name: 'Composition & Camera',
        description: 'Camera placement, perspective, and composition terms.',
        tone: stepMeta.tone,
        match: (_, text) => includesAny(text, ['angle', 'shot', 'perspective', 'view', 'isometric', 'macro', 'focus', 'wide shot', 'establishing', 'over the shoulder']),
      },
      {
        name: 'Architecture & Urban',
        description: 'City, street, interior, and built environments.',
        tone: 'warning',
        match: (_, text) => includesAny(text, ['city', 'street', 'room', 'hall', 'building', 'apartment', 'cafe', 'office', 'urban', 'neon', 'alley', 'rooftop']),
      },
      {
        name: 'Nature & Outdoor',
        description: 'Landscape, weather, and outdoor environments.',
        tone: 'secondary',
        match: (_, text) => includesAny(text, ['forest', 'beach', 'mountain', 'garden', 'river', 'rain', 'snow', 'sky', 'field', 'outdoor', 'sunset', 'nature']),
      },
      {
        name: 'Fantasy & Specialty',
        description: 'Fantasy locales, unusual settings, and specialty spaces.',
        tone: 'secondary',
        match: () => true,
      },
    ];
  }

  if (stepMeta.step === 'style') {
    return [
      {
        name: 'Medium & Rendering',
        description: 'Paint, sketch, render, and production medium.',
        tone: stepMeta.tone,
        match: (_, text) => includesAny(text, ['painting', 'render', 'sketch', 'drawing', 'illustration', 'cgi', 'watercolor', 'pixel art', 'charcoal', 'graphite']),
      },
      {
        name: 'Aesthetic & Genre',
        description: 'Visual aesthetic, genre, and broad stylistic direction.',
        tone: 'warning',
        match: (_, text) => includesAny(text, ['anime', 'realistic', 'cinematic', 'surreal', 'cyberpunk', 'steampunk', 'noir', 'ghibli', 'retro', 'comic']),
      },
      {
        name: 'Artists & References',
        description: 'Artist, studio, franchise, and named reference styles.',
        tone: 'secondary',
        match: (_, text) => includesAny(text, ['style', 'artstation', 'mucha', 'dali', 'magritte', 'miyazaki', 'mappa', 'ufotable', 'gainax', 'toriyama', 'kishimoto']),
      },
      {
        name: 'Surface & Finish',
        description: 'Texture, detail, and finishing style notes.',
        tone: 'secondary',
        match: () => true,
      },
    ];
  }

  if (stepMeta.step === 'atmosphere') {
    return [
      {
        name: 'Lighting',
        description: 'Light direction, intensity, and illumination mood.',
        tone: stepMeta.tone,
        match: (_, text) => includesAny(text, ['light', 'lighting', 'glow', 'shadow', 'backlit', 'rim light', 'sunlit', 'moonlit', 'neon']),
      },
      {
        name: 'Mood & Emotion',
        description: 'Emotional tone and feeling of the scene.',
        tone: 'warning',
        match: (_, text) => includesAny(text, ['moody', 'calm', 'serene', 'dramatic', 'tense', 'romantic', 'dreamy', 'mysterious', 'gloomy', 'elegant', 'glamour']),
      },
      {
        name: 'Color & Palette',
        description: 'Color direction and palette shaping terms.',
        tone: 'secondary',
        match: (_, text) => includesAny(text, ['color', 'palette', 'pastel', 'monochrome', 'vibrant', 'muted', 'golden', 'blue', 'red', 'sunset']),
      },
      {
        name: 'Scene Effects',
        description: 'Ambient effects, particles, and environmental atmosphere.',
        tone: 'secondary',
        match: () => true,
      },
    ];
  }

  return [
    {
      name: 'Positive Quality',
      description: 'Image quality boosters and fidelity cues.',
      tone: stepMeta.tone,
      match: (tag, text) => !tag.negativeText?.trim() && !includesAny(text, ['bad', 'worst', 'lowres', 'blurry', 'error', 'extra', 'deformed']),
    },
    {
      name: 'Cleanup & Negative',
      description: 'Common negative and artifact-removal guidance.',
      tone: 'warning',
      match: (tag, text) => Boolean(tag.negativeText?.trim()) || includesAny(text, ['bad', 'worst', 'lowres', 'blurry', 'error', 'extra', 'deformed']),
    },
    {
      name: 'Refinement',
      description: 'Additional polish and prompt cleanup helpers.',
      tone: 'secondary',
      match: () => true,
    },
  ];
}

export const PromptWizardStepContent = memo(function PromptWizardStepContent({
  stepMeta,
  tags,
  selectedTagIds,
  searchQuery,
  onToggleTag,
}: PromptWizardStepContentProps) {
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [activeMajorGroup, setActiveMajorGroup] = useState<string | null>(null);
  const [selectionFilter, setSelectionFilter] = useState<SelectionFilter>('all');
  const [searchMode, setSearchMode] = useState<SearchMode>('broad');

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
      if (subcat === 'General') {
        counts[subcat] = selectionFilteredTags.filter((t) => !t.subcategory).length;
      } else {
        counts[subcat] = selectionFilteredTags.filter((t) => t.subcategory === subcat).length;
      }
    }
    return counts;
  }, [selectionFilteredTags, sortedSubcategories]);

  const resolvedActiveSubcategory = activeSubcategory && sortedSubcategories.includes(activeSubcategory)
    ? activeSubcategory
    : null;

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
            const leftSelected = selectedTagIds.has(left.id);
            const rightSelected = selectedTagIds.has(right.id);
            if (leftSelected !== rightSelected) {
              return leftSelected ? -1 : 1;
            }
            return left.text.localeCompare(right.text);
          });

        const selectedTags = matchingTags.filter((tag) => selectedTagIds.has(tag.id));
        const remainingTags = matchingTags.filter((tag) => !selectedTagIds.has(tag.id));
        const unassignedTags = [...remainingTags];
        const semanticGroups = getGroupDefinitions(stepMeta).map((definition) => {
          const matchedTags: PromptTag[] = [];
          for (let index = unassignedTags.length - 1; index >= 0; index -= 1) {
            const tag = unassignedTags[index];
            if (definition.match(tag, tag.text.toLowerCase())) {
              matchedTags.unshift(tag);
              unassignedTags.splice(index, 1);
            }
          }
          return {
            name: definition.name,
            description: definition.description,
            tone: definition.tone,
            tags: matchedTags,
          };
        });

        const uncategorizedTags = unassignedTags;

        const groups: TagGroup[] = [
          {
            name: 'Selected',
            description: 'Tags already in your prompt from this group.',
            tone: stepMeta.tone,
            tags: selectedTags,
          },
          ...semanticGroups,
          {
            name: 'More Options',
            description: 'Tags that do not neatly fit the current inferred groups.',
            tone: 'secondary',
            tags: uncategorizedTags,
          },
        ].filter((group) => group.tags.length > 0);

        return {
          name: sectionName,
          groups,
        };
      })
      .filter((section) => section.groups.length > 0);
  }, [resolvedActiveSubcategory, selectedTagIds, selectionFilteredTags, sortedSubcategories, stepMeta]);

  const majorGroupTabs = useMemo(() => {
    const counts = new Map<string, { count: number; tone: TagGroup['tone'] }>();
    for (const section of sections) {
      for (const group of section.groups) {
        const existing = counts.get(group.name);
        if (existing) {
          existing.count += group.tags.length;
        }
        else {
          counts.set(group.name, { count: group.tags.length, tone: group.tone });
        }
      }
    }
    return Array.from(counts.entries()).map(([name, meta]) => ({
      name,
      count: meta.count,
      tone: meta.tone,
    }));
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

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Box
        px="lg"
        py="md"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          background: `linear-gradient(180deg, color-mix(in srgb, var(--mantine-color-${stepMeta.tone}-light) 55%, transparent), transparent)`,
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

      <Box px="lg" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
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

      {majorGroupTabs.length > 0 && (
        <Box px="lg" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
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
                  onClick={() => setActiveMajorGroup(group.name)}
                >
                  {group.name} ({group.count})
                </SwarmBadge>
              ))}
            </Group>
          </ScrollArea>
        </Box>
      )}

      {/* Tag grid */}
      <ScrollArea style={{ flex: 1, minHeight: 0 }} offsetScrollbars>
        <Box p="lg">
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
            <Stack gap="lg">
              {filteredSections.map((section) => (
                <ElevatedCard
                  key={section.name}
                  elevation="floor"
                  withBorder
                  style={{
                    padding: '18px 20px',
                    borderColor: `color-mix(in srgb, var(--mantine-color-${stepMeta.tone}-filled) 18%, var(--mantine-color-default-border))`,
                  }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="center">
                      <Group gap="xs" align="center">
                        <SwarmBadge tone={stepMeta.tone} emphasis="soft" size="lg">
                          {section.name}
                        </SwarmBadge>
                        <Text size="md" c="dimmed">
                          {section.groups.reduce((total, group) => total + group.tags.length, 0)} tag{section.groups.reduce((total, group) => total + group.tags.length, 0) === 1 ? '' : 's'}
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
                            <Group justify="space-between" align="flex-start">
                              <Group gap="xs" align="center">
                                <SwarmBadge tone={group.tone} emphasis="soft" size="lg">
                                  {group.name}
                                </SwarmBadge>
                                <Text size="md" c="dimmed">
                                  {group.tags.length}
                                </Text>
                              </Group>
                              <Text size="sm" c="dimmed" style={{ maxWidth: 320, textAlign: 'right' }}>
                                {group.description}
                              </Text>
                            </Group>
                            <Group gap="sm">
                              {group.tags.map((tag) => (
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
