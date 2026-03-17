import { memo, useEffect, useMemo, useState } from 'react';
import { ActionIcon, Box, Center, Divider, Group, Loader, Modal, ScrollArea, Select, Stack, Text, TextInput, Textarea, ThemeIcon, Tooltip, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconChevronRight, IconLibraryPhoto, IconPlus, IconSearch, IconSparkles, IconTrash, IconX } from '@tabler/icons-react';
import { usePromptPresetsStore, CATEGORY_LABELS, CATEGORY_ORDER, type PresetCategory, type PromptPreset } from '../stores/promptPresets';
import { ElevatedCard, SwarmActionIcon, SwarmBadge, SwarmButton, SwarmSegmentedControl } from './ui';

interface PromptPresetSelectorProps {
    onApplyToPrompt?: (text: string) => void;
    onApplyToNegative?: (text: string) => void;
    compact?: boolean;
}

interface CustomPresetDraft {
    name: string;
    category: PresetCategory;
    promptText: string;
    negativePromptText: string;
}

const EMPTY_DRAFT: CustomPresetDraft = { name: '', category: 'style', promptText: '', negativePromptText: '' };
type BrowseView = 'discover' | 'selected' | 'custom';

function parsePresetTerms(text?: string): string[] {
    if (!text) return [];

    const seen = new Set<string>();
    return text
        .split(/[,;\n]/)
        .map((term) => term.trim())
        .filter((term) => {
            if (!term) return false;
            const key = term.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function groupPresetsByCategory(presets: PromptPreset[]): Array<{ category: PresetCategory; presets: PromptPreset[] }> {
    return CATEGORY_ORDER
        .map((category) => ({
            category,
            presets: presets.filter((preset) => preset.category === category),
        }))
        .filter((group) => group.presets.length > 0);
}

export const PromptPresetSelector = memo(function PromptPresetSelector({
    onApplyToPrompt,
    onApplyToNegative,
    compact = false,
}: PromptPresetSelectorProps) {
    const [opened, { open, close }] = useDisclosure(false);
    const [activeCategory, setActiveCategory] = useState<PresetCategory | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [creatingPreset, setCreatingPreset] = useState(false);
    const [draft, setDraft] = useState<CustomPresetDraft>(EMPTY_DRAFT);
    const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);
    const [selectedPromptTerms, setSelectedPromptTerms] = useState<Record<string, string[]>>({});
    const [selectedNegativeTerms, setSelectedNegativeTerms] = useState<Record<string, string[]>>({});
    const [wholePresetStatus, setWholePresetStatus] = useState<string | null>(null);
    const [browseView, setBrowseView] = useState<BrowseView>('discover');

    const {
        presets,
        selectedPresetIds,
        hasLoadedDefaults,
        isLoadingDefaults,
        ensureDefaultsLoaded,
        togglePreset,
        clearSelections,
        addCustomPreset,
        removePreset,
        getSelectedPresets,
        getCombinedPrompt,
        getCombinedNegativePrompt,
    } = usePromptPresetsStore();

    useEffect(() => {
        if (!opened || hasLoadedDefaults || isLoadingDefaults) {
            return;
        }

        ensureDefaultsLoaded().catch(() => {
            notifications.show({
                title: 'Prompt Library Unavailable',
                message: 'The built-in prompt presets could not be loaded right now.',
                color: 'red',
            });
        });
    }, [ensureDefaultsLoaded, hasLoadedDefaults, isLoadingDefaults, opened]);

    const selectedCount = selectedPresetIds.length;
    const selectedPresets = getSelectedPresets();
    const combinedPrompt = getCombinedPrompt();
    const combinedNegativePrompt = getCombinedNegativePrompt();
    const combinedSelectedPromptTerms = useMemo(
        () =>
            Object.values(selectedPromptTerms)
                .flat()
                .filter((term, index, all) => all.findIndex((value) => value.toLowerCase() === term.toLowerCase()) === index)
                .join(', '),
        [selectedPromptTerms]
    );
    const combinedSelectedNegativeTerms = useMemo(
        () =>
            Object.values(selectedNegativeTerms)
                .flat()
                .filter((term, index, all) => all.findIndex((value) => value.toLowerCase() === term.toLowerCase()) === index)
                .join(', '),
        [selectedNegativeTerms]
    );

    const filteredPresets = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return presets;
        return presets.filter((preset) =>
            preset.name.toLowerCase().includes(query)
            || preset.promptText.toLowerCase().includes(query)
            || (preset.negativePromptText?.toLowerCase().includes(query) ?? false)
            || CATEGORY_LABELS[preset.category].toLowerCase().includes(query)
        );
    }, [presets, searchQuery]);

    const categoryCounts = useMemo(
        () => CATEGORY_ORDER.reduce<Record<PresetCategory, number>>((acc, category) => {
            acc[category] = filteredPresets.filter((preset) => preset.category === category).length;
            return acc;
        }, {} as Record<PresetCategory, number>),
        [filteredPresets]
    );
    const selectedPresetsByCategory = useMemo(() => groupPresetsByCategory(selectedPresets), [selectedPresets]);
    const customPresets = useMemo(() => presets.filter((preset) => !preset.isDefault), [presets]);
    const customPresetsByCategory = useMemo(() => groupPresetsByCategory(customPresets), [customPresets]);

    const firstPopulatedCategory = useMemo(
        () => CATEGORY_ORDER.find((category) => presets.some((preset) => preset.category === category)) ?? 'style',
        [presets]
    );

    const visibleCategory = activeCategory && CATEGORY_ORDER.includes(activeCategory)
        ? activeCategory
        : firstPopulatedCategory;
    const hasSearch = searchQuery.trim().length > 0;
    const categoryOptions = CATEGORY_ORDER.filter((category) => categoryCounts[category] > 0 || !hasSearch);
    const groupedSearchResults = useMemo(() => groupPresetsByCategory(filteredPresets), [filteredPresets]);
    const groupedBrowseResults = useMemo(() => {
        if (hasSearch) {
            return groupedSearchResults;
        }
        if (browseView === 'selected') {
            return selectedPresetsByCategory;
        }
        if (browseView === 'custom') {
            return customPresetsByCategory;
        }
        return groupPresetsByCategory(filteredPresets.filter((preset) => preset.category === visibleCategory));
    }, [browseView, customPresetsByCategory, filteredPresets, groupedSearchResults, hasSearch, selectedPresetsByCategory, visibleCategory]);

    const closeCreator = () => {
        setCreatingPreset(false);
        setDraft(EMPTY_DRAFT);
    };

    const toggleTerm = (
        presetId: string,
        term: string,
        type: 'prompt' | 'negative'
    ) => {
        const setter = type === 'prompt' ? setSelectedPromptTerms : setSelectedNegativeTerms;
        setter((current) => {
            const terms = current[presetId] ?? [];
            const exists = terms.some((value) => value.toLowerCase() === term.toLowerCase());
            const nextTerms = exists
                ? terms.filter((value) => value.toLowerCase() !== term.toLowerCase())
                : [...terms, term];

            if (nextTerms.length === 0) {
                const next = { ...current };
                delete next[presetId];
                return next;
            }

            return {
                ...current,
                [presetId]: nextTerms,
            };
        });
    };

    const handleApplyPrompt = () => {
        if (!combinedPrompt || !onApplyToPrompt) return;
        onApplyToPrompt(combinedPrompt);
        setWholePresetStatus('Whole preset text added to the main prompt. Library stays open so you can keep building.');
        notifications.show({ title: 'Prompt Presets Applied', message: 'Selected preset text was added to the prompt.', color: 'teal' });
    };

    const handleApplyNegative = () => {
        if (!combinedNegativePrompt || !onApplyToNegative) return;
        onApplyToNegative(combinedNegativePrompt);
        setWholePresetStatus('Whole preset exclusions added to the negative prompt. You can keep the library open and continue selecting.');
        notifications.show({ title: 'Negative Prompt Updated', message: 'Selected preset exclusions were added to the negative prompt.', color: 'teal' });
    };

    const handleApplyPromptTerms = () => {
        if (!combinedSelectedPromptTerms || !onApplyToPrompt) return;
        onApplyToPrompt(combinedSelectedPromptTerms);
        notifications.show({ title: 'Selected Words Applied', message: 'The selected prompt words were added to the prompt.', color: 'teal' });
        close();
    };

    const handleApplyNegativeTerms = () => {
        if (!combinedSelectedNegativeTerms || !onApplyToNegative) return;
        onApplyToNegative(combinedSelectedNegativeTerms);
        notifications.show({ title: 'Selected Negative Words Applied', message: 'The selected negative words were added to the negative prompt.', color: 'teal' });
        close();
    };

    const handleCreatePreset = () => {
        if (!draft.name.trim() || !draft.promptText.trim()) {
            notifications.show({ title: 'Preset Needs More Detail', message: 'Provide a preset name and prompt text before saving.', color: 'yellow' });
            return;
        }
        addCustomPreset({
            name: draft.name.trim(),
            category: draft.category,
            promptText: draft.promptText.trim(),
            negativePromptText: draft.negativePromptText.trim() || undefined,
            isDefault: false,
        });
        notifications.show({
            title: 'Custom Preset Saved',
            message: `${draft.name.trim()} is now available in ${CATEGORY_LABELS[draft.category]}.`,
            color: 'teal',
        });
        setActiveCategory(draft.category);
        closeCreator();
    };

    const handleDeletePreset = (id: string, name: string) => {
        removePreset(id);
        notifications.show({ title: 'Preset Removed', message: `${name} was removed from your custom prompt presets.`, color: 'gray' });
    };

    const renderPresetCard = (preset: PromptPreset) => {
        const isSelected = selectedPresetIds.includes(preset.id);
        const isCustom = !preset.isDefault;
        const promptTerms = parsePresetTerms(preset.promptText);
        const negativeTerms = parsePresetTerms(preset.negativePromptText);
        const isExpanded = expandedPresetId === preset.id;
        const activePromptTerms = selectedPromptTerms[preset.id] ?? [];
        const activeNegativeTerms = selectedNegativeTerms[preset.id] ?? [];

        return (
            <UnstyledButton key={preset.id} onClick={() => togglePreset(preset.id)} style={{ width: '100%', textAlign: 'left' }} aria-pressed={isSelected}>
                <ElevatedCard
                    elevation={isSelected ? 'raised' : 'paper'}
                    tone={isSelected ? 'accent' : 'neutral'}
                    withBorder
                    interactive
                    style={{ padding: 14, borderColor: isSelected ? 'color-mix(in srgb, var(--theme-accent-2) 45%, var(--theme-gray-5))' : undefined }}
                >
                    <Stack gap="xs">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <Stack gap={4} style={{ minWidth: 0 }}>
                                <Group gap="xs">
                                    <Text fw={600} size="sm">{preset.name}</Text>
                                    <SwarmBadge tone={isCustom ? 'warning' : 'secondary'} emphasis="soft">{isCustom ? 'Custom' : 'Built-in'}</SwarmBadge>
                                    {!hasSearch && browseView !== 'discover' && (
                                        <SwarmBadge tone="info" emphasis="soft">{CATEGORY_LABELS[preset.category]}</SwarmBadge>
                                    )}
                                    {preset.negativePromptText && <SwarmBadge tone="danger" emphasis="soft">Negative</SwarmBadge>}
                                </Group>
                                <Text size="sm" c="dimmed" lineClamp={2}>{preset.promptText}</Text>
                            </Stack>
                            <Group gap="xs" wrap="nowrap">
                                <SwarmButton
                                    tone={isExpanded ? 'info' : 'secondary'}
                                    emphasis={isExpanded ? 'soft' : 'ghost'}
                                    size="compact-xs"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setExpandedPresetId((current) => current === preset.id ? null : preset.id);
                                    }}
                                >
                                    Words
                                </SwarmButton>
                                {isCustom && (
                                    <Tooltip label="Delete custom preset" withArrow>
                                        <ActionIcon
                                            variant="subtle"
                                            color="red"
                                            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                                                event.stopPropagation();
                                                handleDeletePreset(preset.id, preset.name);
                                            }}
                                            aria-label={`Delete ${preset.name}`}
                                        >
                                            <IconTrash size={16} />
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                                <SwarmBadge tone={isSelected ? 'primary' : 'secondary'} emphasis={isSelected ? 'solid' : 'soft'}>
                                    {isSelected ? 'Selected' : 'Available'}
                                </SwarmBadge>
                            </Group>
                        </Group>
                        {preset.negativePromptText && (
                            <>
                                <Divider />
                                <Text size="xs" c="dimmed" lineClamp={2}>Negative: {preset.negativePromptText}</Text>
                            </>
                        )}
                        {isExpanded && (
                            <>
                                <Divider />
                                <Stack gap="xs">
                                    <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                                        Pick individual words
                                    </Text>
                                    <Group gap="xs">
                                        {promptTerms.map((term) => {
                                            const selected = activePromptTerms.some((value) => value.toLowerCase() === term.toLowerCase());
                                            return (
                                                <SwarmBadge
                                                    key={`${preset.id}-prompt-${term}`}
                                                    tone={selected ? 'primary' : 'secondary'}
                                                    emphasis={selected ? 'solid' : 'soft'}
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={(event: React.MouseEvent<HTMLDivElement>) => {
                                                        event.stopPropagation();
                                                        toggleTerm(preset.id, term, 'prompt');
                                                    }}
                                                >
                                                    {term}
                                                </SwarmBadge>
                                            );
                                        })}
                                    </Group>
                                    {negativeTerms.length > 0 && (
                                        <Stack gap="xs">
                                            <Text size="xs" tt="uppercase" fw={600} c="dimmed">
                                                Negative words
                                            </Text>
                                            <Group gap="xs">
                                                {negativeTerms.map((term) => {
                                                    const selected = activeNegativeTerms.some((value) => value.toLowerCase() === term.toLowerCase());
                                                    return (
                                                        <SwarmBadge
                                                            key={`${preset.id}-negative-${term}`}
                                                            tone={selected ? 'danger' : 'secondary'}
                                                            emphasis={selected ? 'solid' : 'soft'}
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={(event: React.MouseEvent<HTMLDivElement>) => {
                                                                event.stopPropagation();
                                                                toggleTerm(preset.id, term, 'negative');
                                                            }}
                                                        >
                                                            {term}
                                                        </SwarmBadge>
                                                    );
                                                })}
                                            </Group>
                                        </Stack>
                                    )}
                                </Stack>
                            </>
                        )}
                    </Stack>
                </ElevatedCard>
            </UnstyledButton>
        );
    };

    const triggerSummary = selectedCount > 0 ? `${selectedCount} selected` : 'Browse styles, lighting, characters, and more';

    return (
        <>
            <UnstyledButton
                onClick={() => {
                    open();
                    if (!hasLoadedDefaults && !isLoadingDefaults) {
                        void ensureDefaultsLoaded().catch(() => {
                            notifications.show({
                                title: 'Prompt Library Unavailable',
                                message: 'The built-in prompt presets could not be loaded right now.',
                                color: 'red',
                            });
                        });
                    }
                }}
                style={{ width: '100%', textAlign: 'left' }}
                aria-label="Open prompt preset library"
            >
                <ElevatedCard
                    elevation="paper"
                    withBorder
                    interactive
                    className={compact ? 'generate-studio__prompt-library-card--compact' : undefined}
                    style={{ padding: compact ? 10 : 14 }}
                >
                    <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                            <ThemeIcon
                                size={compact ? 32 : 38}
                                radius="md"
                                variant="light"
                                color="gray"
                                style={{ backgroundColor: 'var(--elevation-raised)' }}
                            >
                                <IconLibraryPhoto size={20} />
                            </ThemeIcon>
                            <Stack gap={2}>
                                <Group gap="xs">
                                    <Text fw={600} size="sm">Prompt Library</Text>
                                    <SwarmBadge tone={selectedCount > 0 ? 'primary' : 'secondary'} emphasis="soft">
                                        {selectedCount > 0 ? `${selectedCount} active` : 'Ready'}
                                    </SwarmBadge>
                                    {(combinedSelectedPromptTerms || combinedSelectedNegativeTerms) && (
                                        <SwarmBadge tone="info" emphasis="soft">
                                            Words ready
                                        </SwarmBadge>
                                    )}
                                </Group>
                                <Text size="xs" c="dimmed">
                                    {compact ? 'Browse styles, characters, and reusable prompt text.' : triggerSummary}
                                </Text>
                            </Stack>
                        </Group>
                        <Group gap="xs" wrap="nowrap">
                            {selectedCount > 0 && (
                                <Tooltip label="Clear all selected presets" withArrow>
                                    <SwarmActionIcon
                                        tone="secondary"
                                        emphasis="ghost"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            clearSelections();
                                        }}
                                        label="Clear selected presets"
                                    >
                                        <IconX size={16} />
                                    </SwarmActionIcon>
                                </Tooltip>
                            )}
                            <ThemeIcon size={compact ? 28 : 32} radius="xl" variant="light" color="gray">
                                <IconChevronRight size={18} />
                            </ThemeIcon>
                        </Group>
                    </Group>
                </ElevatedCard>
            </UnstyledButton>

            <Modal
                opened={opened}
                onClose={close}
                size="xl"
                padding={0}
                centered
                styles={{
                    content: { overflow: 'hidden', background: 'var(--elevation-table)' },
                    header: { display: 'none' },
                    body: { padding: 0 },
                }}
            >
                <Stack gap={0}>
                    {isLoadingDefaults && !hasLoadedDefaults ? (
                        <Center p="xl" mih={320}>
                            <Stack align="center" gap="sm">
                                <Loader size="sm" />
                                <Text size="sm" c="dimmed">Loading prompt presets...</Text>
                            </Stack>
                        </Center>
                    ) : (
                        <>
                            <Box px="lg" py="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', background: 'linear-gradient(180deg, color-mix(in srgb, var(--elevation-raised) 82%, transparent), transparent)' }}>
                                <Stack gap="md">
                                    <Group justify="space-between" align="flex-start">
                                        <Group align="flex-start" gap="sm">
                                            <ThemeIcon size={42} radius="md" variant="light" color="gray" style={{ backgroundColor: 'var(--elevation-paper)' }}>
                                                <IconSparkles size={20} />
                                            </ThemeIcon>
                                            <Stack gap={3}>
                                                <Group gap="xs">
                                                    <Text fw={700} size="lg">Prompt Library</Text>
                                                    <SwarmBadge tone="secondary" emphasis="soft">{presets.length} presets</SwarmBadge>
                                                </Group>
                                                <Text size="sm" c="dimmed">Build prompts faster with reusable tags, then apply only what you need.</Text>
                                            </Stack>
                                        </Group>
                                        <Group gap="xs">
                                            <SwarmButton
                                                tone={creatingPreset ? 'warning' : 'secondary'}
                                                emphasis={creatingPreset ? 'soft' : 'ghost'}
                                                leftSection={<IconPlus size={16} />}
                                                onClick={() => {
                                                    if (creatingPreset) {
                                                        closeCreator();
                                                        return;
                                                    }
                                                    setCreatingPreset(true);
                                                }}
                                            >
                                                {creatingPreset ? 'Close Editor' : 'Create Preset'}
                                            </SwarmButton>
                                            <SwarmActionIcon tone="secondary" emphasis="ghost" onClick={close} label="Close prompt library">
                                                <IconX size={18} />
                                            </SwarmActionIcon>
                                        </Group>
                                    </Group>

                                    <Group align="stretch" gap="sm">
                                        <TextInput
                                            placeholder="Search presets, prompt text, exclusions, or categories"
                                            leftSection={<IconSearch size={16} />}
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.currentTarget.value)}
                                            style={{ flex: 1 }}
                                        />
                                        <ElevatedCard elevation="paper" withBorder style={{ minWidth: 170, padding: 12 }}>
                                            <Stack gap={2}>
                                                <Text size="xs" tt="uppercase" c="dimmed" fw={600}>Selected</Text>
                                                <Text size="lg" fw={700}>{selectedCount}</Text>
                                                <Text size="xs" c="dimmed">
                                                    {selectedCount === 0
                                                        ? (combinedSelectedPromptTerms || combinedSelectedNegativeTerms ? 'Word picks ready' : 'No active presets yet')
                                                        : 'Ready to apply'}
                                                </Text>
                                            </Stack>
                                        </ElevatedCard>
                                    </Group>

                                    {wholePresetStatus && (
                                        <ElevatedCard elevation="paper" withBorder tone="success" style={{ padding: 12 }}>
                                            <Text size="sm">{wholePresetStatus}</Text>
                                        </ElevatedCard>
                                    )}

                                    {selectedCount > 0 && (
                                        <ElevatedCard elevation="paper" withBorder style={{ padding: 12 }}>
                                            <Stack gap="xs">
                                                <Group justify="space-between" align="center">
                                                    <Text size="xs" tt="uppercase" c="dimmed" fw={600}>Active Selection</Text>
                                                    <SwarmButton tone="secondary" emphasis="ghost" size="compact-xs" onClick={clearSelections}>Clear all</SwarmButton>
                                                </Group>
                                                <Group gap="xs">
                                                    {selectedPresets.slice(0, 8).map((preset) => (
                                                        <SwarmBadge key={preset.id} tone="primary" emphasis="soft">{preset.name}</SwarmBadge>
                                                    ))}
                                                    {selectedCount > 8 && <SwarmBadge tone="secondary" emphasis="soft">+{selectedCount - 8} more</SwarmBadge>}
                                                </Group>
                                            </Stack>
                                        </ElevatedCard>
                                    )}

                                    {creatingPreset && (
                                        <ElevatedCard elevation="paper" withBorder tone="accent">
                                            <Stack gap="sm">
                                                <Group justify="space-between" align="center">
                                                    <Text fw={600}>Create Custom Preset</Text>
                                                    <Text size="xs" c="dimmed">Saved locally to your prompt library</Text>
                                                </Group>
                                                <Group grow align="flex-start">
                                                    <TextInput
                                                        label="Name"
                                                        placeholder="Neon noir portrait"
                                                        value={draft.name}
                                                        onChange={(event) => setDraft((current) => ({ ...current, name: event.currentTarget.value }))}
                                                    />
                                                    <Select
                                                        label="Category"
                                                        data={CATEGORY_ORDER.map((category) => ({ value: category, label: CATEGORY_LABELS[category] }))}
                                                        value={draft.category}
                                                        onChange={(value) => value && setDraft((current) => ({ ...current, category: value as PresetCategory }))}
                                                    />
                                                </Group>
                                                <Textarea
                                                    label="Prompt text"
                                                    placeholder="cinematic noir lighting, rain-soaked alley, reflective pavement"
                                                    autosize
                                                    minRows={3}
                                                    value={draft.promptText}
                                                    onChange={(event) => setDraft((current) => ({ ...current, promptText: event.currentTarget.value }))}
                                                />
                                                <Textarea
                                                    label="Negative prompt"
                                                    placeholder="Optional exclusions for the negative prompt"
                                                    autosize
                                                    minRows={2}
                                                    value={draft.negativePromptText}
                                                    onChange={(event) => setDraft((current) => ({ ...current, negativePromptText: event.currentTarget.value }))}
                                                />
                                                <Group justify="flex-end">
                                                    <SwarmButton tone="secondary" emphasis="ghost" onClick={closeCreator}>Cancel</SwarmButton>
                                                    <SwarmButton tone="primary" leftSection={<IconPlus size={16} />} onClick={handleCreatePreset}>Save Preset</SwarmButton>
                                                </Group>
                                            </Stack>
                                        </ElevatedCard>
                                    )}
                                </Stack>
                            </Box>

                            <Stack gap={0} style={{ minHeight: 420 }}>
                                <Box px="md" py="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', background: 'color-mix(in srgb, var(--elevation-floor) 42%, transparent)' }}>
                                    <Stack gap="sm">
                                        <Group justify="space-between" align="center" wrap="wrap">
                                            <Stack gap={2}>
                                                <Text size="xs" tt="uppercase" fw={600} c="dimmed">Browse mode</Text>
                                                <Text size="sm" c="dimmed">{hasSearch ? ` for "${searchQuery.trim()}"` : ''}</Text>
                                            </Stack>
                                            <SwarmSegmentedControl
                                                value={browseView}
                                                onChange={(value) => setBrowseView(value as BrowseView)}
                                                data={[
                                                    { label: `Discover${!hasSearch ? '' : ` (${filteredPresets.length})`}`, value: 'discover' },
                                                    { label: `Selected`, value: 'selected' },
                                                    { label: `Custom`, value: 'custom' },
                                                ]}
                                            />
                                        </Group>
                                        {!hasSearch && browseView === 'discover' && (
                                            <ScrollArea offsetScrollbars>
                                                <Group gap="xs" wrap="nowrap">
                                                    {categoryOptions.map((category) => {
                                                        const isActive = category === visibleCategory;
                                                        return (
                                                            <UnstyledButton key={category} onClick={() => setActiveCategory(category)}>
                                                                <ElevatedCard
                                                                    elevation={isActive ? 'raised' : 'floor'}
                                                                    tone={isActive ? 'accent' : 'neutral'}
                                                                    withBorder
                                                                    style={{
                                                                        padding: '8px 12px',
                                                                        minWidth: 140,
                                                                        borderColor: isActive ? 'color-mix(in srgb, var(--theme-accent-2) 45%, var(--theme-gray-5))' : undefined,
                                                                    }}
                                                                >
                                                                    <Group justify="space-between" wrap="nowrap" gap="xs">
                                                                        <Text size="sm" fw={isActive ? 600 : 500}>{CATEGORY_LABELS[category]}</Text>
                                                                        <SwarmBadge tone={isActive ? 'primary' : 'secondary'} emphasis={isActive ? 'solid' : 'soft'}>{categoryCounts[category]}</SwarmBadge>
                                                                    </Group>
                                                                </ElevatedCard>
                                                            </UnstyledButton>
                                                        );
                                                    })}
                                                </Group>
                                            </ScrollArea>
                                        )}
                                    </Stack>
                                </Box>

                                <Box style={{ flex: 1, minWidth: 0 }}>
                                    <ScrollArea h={420} offsetScrollbars>
                                        <Stack gap="md" p="md">
                                            {groupedBrowseResults.length === 0 ? (
                                                <ElevatedCard elevation="floor" withBorder>
                                                    <Stack align="center" gap="xs" py="xl">
                                                        <ThemeIcon size={42} radius="xl" variant="light" color="gray"><IconSearch size={18} /></ThemeIcon>
                                                        <Text fw={600}>
                                                            {hasSearch
                                                                ? 'No matching presets found'
                                                                : browseView === 'selected'
                                                                    ? 'No presets selected yet'
                                                                    : browseView === 'custom'
                                                                        ? 'No custom presets yet'
                                                                        : 'No presets in this category yet'}
                                                        </Text>
                                                        <Text size="sm" c="dimmed" ta="center" maw={360}>
                                                            {hasSearch
                                                                ? 'Try another search term to broaden the results.'
                                                                : browseView === 'selected'
                                                                    ? 'Pick presets in Discover to build a reusable stack, then come back here to review it.'
                                                                    : browseView === 'custom'
                                                                        ? 'Create a custom preset here to keep your favorite prompt blocks close.'
                                                                        : 'Create a custom preset here to start building out this section.'}
                                                        </Text>
                                                    </Stack>
                                                </ElevatedCard>
                                            ) : (
                                                groupedBrowseResults.map((group) => (
                                                    <Stack key={group.category} gap="sm">
                                                        {(hasSearch || browseView !== 'discover') && (
                                                            <Group justify="space-between" align="center">
                                                                <Stack gap={2}>
                                                                    <Text fw={600}>{CATEGORY_LABELS[group.category]}</Text>
                                                                    <Text size="sm" c="dimmed">
                                                                        {group.presets.length} preset{group.presets.length === 1 ? '' : 's'}
                                                                    </Text>
                                                                </Stack>
                                                                <SwarmBadge tone="secondary" emphasis="soft">{group.presets.length}</SwarmBadge>
                                                            </Group>
                                                        )}
                                                        {group.presets.map((preset) => renderPresetCard(preset))}
                                                    </Stack>
                                                ))
                                            )}
                                        </Stack>
                                    </ScrollArea>
                                </Box>
                            </Stack>

                            <Box px="lg" py="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)', position: 'sticky', bottom: 0, background: 'color-mix(in srgb, var(--elevation-table) 92%, transparent)', backdropFilter: 'blur(8px)' }}>
                                <Stack gap="sm">
                                    <Group justify="space-between" align="center">
                                        <Stack gap={2}>
                                            <Text fw={600} size="sm">Apply selection</Text>
                                            <Text size="xs" c="dimmed">Add the combined preset text to the positive or negative prompt.</Text>
                                        </Stack>
                                        <SwarmButton tone="secondary" emphasis="ghost" onClick={clearSelections} disabled={selectedCount === 0}>Clear selection</SwarmButton>
                                    </Group>
                                    <Group grow align="stretch">
                                        <ElevatedCard elevation="floor" withBorder style={{ minHeight: 88 }}>
                                            <Stack gap={4}>
                                                <Text size="xs" tt="uppercase" fw={600} c="dimmed">Whole preset text to add</Text>
                                                <Text size="sm" c={combinedPrompt ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-wrap' }}>
                                                    {combinedPrompt || 'Select presets to preview the combined prompt text.'}
                                                </Text>
                                            </Stack>
                                        </ElevatedCard>
                                        <ElevatedCard elevation="floor" withBorder style={{ minHeight: 88 }}>
                                            <Stack gap={4}>
                                                <Text size="xs" tt="uppercase" fw={600} c="dimmed">Whole negative text to add</Text>
                                                <Text size="sm" c={combinedNegativePrompt ? undefined : 'dimmed'} style={{ whiteSpace: 'pre-wrap' }}>
                                                    {combinedNegativePrompt || 'No negative prompt additions in the current selection.'}
                                                </Text>
                                            </Stack>
                                        </ElevatedCard>
                                    </Group>
                                    <Group grow align="stretch">
                                        <ElevatedCard elevation="floor" withBorder style={{ minHeight: 88 }}>
                                            <Stack gap={4}>
                                                <Text size="xs" tt="uppercase" fw={600} c="dimmed">Selected words preview</Text>
                                                <Text size="sm" lineClamp={3} c={combinedSelectedPromptTerms ? undefined : 'dimmed'}>
                                                    {combinedSelectedPromptTerms || 'Open a preset and pick individual words for a more surgical prompt insert.'}
                                                </Text>
                                            </Stack>
                                        </ElevatedCard>
                                        <ElevatedCard elevation="floor" withBorder style={{ minHeight: 88 }}>
                                            <Stack gap={4}>
                                                <Text size="xs" tt="uppercase" fw={600} c="dimmed">Selected negative words</Text>
                                                <Text size="sm" lineClamp={3} c={combinedSelectedNegativeTerms ? undefined : 'dimmed'}>
                                                    {combinedSelectedNegativeTerms || 'Pick individual negative words when you only want part of a preset exclusion list.'}
                                                </Text>
                                            </Stack>
                                        </ElevatedCard>
                                    </Group>
                                    <Group grow>
                                        <SwarmButton tone="primary" leftSection={<IconPlus size={16} />} onClick={handleApplyPrompt} disabled={!combinedPrompt}>Add Whole Presets</SwarmButton>
                                        <SwarmButton tone="danger" emphasis="soft" leftSection={<IconPlus size={16} />} onClick={handleApplyNegative} disabled={!combinedNegativePrompt}>Add Whole Negatives</SwarmButton>
                                    </Group>
                                    <Group grow>
                                        <SwarmButton tone="info" emphasis="soft" leftSection={<IconPlus size={16} />} onClick={handleApplyPromptTerms} disabled={!combinedSelectedPromptTerms}>
                                            Add Selected Words
                                        </SwarmButton>
                                        <SwarmButton tone="danger" emphasis="ghost" leftSection={<IconPlus size={16} />} onClick={handleApplyNegativeTerms} disabled={!combinedSelectedNegativeTerms}>
                                            Add Negative Words
                                        </SwarmButton>
                                    </Group>
                                </Stack>
                            </Box>
                        </>
                    )}
                </Stack>
            </Modal>
        </>
    );
});
