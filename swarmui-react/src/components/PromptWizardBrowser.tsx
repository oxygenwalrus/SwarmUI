import { memo, useCallback, useMemo, useState } from 'react';
import { Box, ScrollArea, SimpleGrid, Stack, Tabs, Text, TextInput } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { SwarmButton } from './ui';
import { PromptWizardPresetCard } from './PromptWizardPresetCard';
import { PromptWizardPresetCreator } from './PromptWizardPresetCreator';
import { PRESET_CATEGORIES, PRESET_CATEGORY_LABELS } from '../features/promptWizard/types';
import type { BrowserPreset, PresetCategory, PromptTag } from '../features/promptWizard/types';

interface PromptWizardBrowserProps {
  defaultPresets: BrowserPreset[];
  userPresets: BrowserPreset[];
  activeCategory: PresetCategory;
  searchQuery: string;
  selectedTagIds: string[];
  allTags: PromptTag[];
  onCategoryChange: (category: PresetCategory) => void;
  onSearchChange: (query: string) => void;
  onApplyPreset: (tagIds: string[]) => void;
  onAddPreset: (preset: Omit<BrowserPreset, 'id' | 'isDefault'>) => void;
  onUpdatePreset: (presetId: string, updates: Partial<Pick<BrowserPreset, 'name' | 'description' | 'category' | 'tagIds' | 'thumbnail'>>) => void;
  onRemovePreset: (presetId: string) => void;
}

export const PromptWizardBrowser = memo(function PromptWizardBrowser({
  defaultPresets,
  userPresets,
  activeCategory,
  searchQuery,
  selectedTagIds,
  allTags,
  onCategoryChange,
  onSearchChange,
  onApplyPreset,
  onAddPreset,
  onUpdatePreset,
  onRemovePreset,
}: PromptWizardBrowserProps) {
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const allPresets = useMemo(
    () => [...defaultPresets, ...userPresets],
    [defaultPresets, userPresets]
  );

  const filteredPresets = useMemo(() => {
    let result = allPresets.filter((p) => p.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allPresets, activeCategory, searchQuery]);

  const handleSavePreset = useCallback(
    (preset: Omit<BrowserPreset, 'id' | 'isDefault'>) => {
      if (editingPresetId) {
        onUpdatePreset(editingPresetId, preset);
        setEditingPresetId(null);
      } else {
        onAddPreset(preset);
      }
      setCreatorOpen(false);
    },
    [editingPresetId, onAddPreset, onUpdatePreset]
  );

  const handleEditPreset = useCallback((preset: BrowserPreset) => {
    setEditingPresetId(preset.id);
    setCreatorOpen(true);
  }, []);

  const handleCancelCreator = useCallback(() => {
    setCreatorOpen(false);
    setEditingPresetId(null);
  }, []);

  const editingPreset = editingPresetId
    ? allPresets.find((p) => p.id === editingPresetId)
    : undefined;

  return (
    <Stack gap={0} style={{ height: '100%', minHeight: 0 }}>
      {/* Category tabs */}
      <Tabs
        value={activeCategory}
        onChange={(val) => val && onCategoryChange(val as PresetCategory)}
        variant="outline"
        style={{ flexShrink: 0 }}
      >
        <Tabs.List px="md" pt="sm">
          {PRESET_CATEGORIES.map((cat) => (
            <Tabs.Tab key={cat} value={cat}>
              {PRESET_CATEGORY_LABELS[cat]}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {/* Search */}
      <Box px="md" py="xs" style={{ flexShrink: 0 }}>
        <TextInput
          placeholder="Search presets..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          size="sm"
        />
      </Box>

      {/* Content: creator or grid */}
      <ScrollArea style={{ flex: 1, minHeight: 0 }} px="md" pb="md">
        {creatorOpen ? (
          <PromptWizardPresetCreator
            activeCategory={activeCategory}
            selectedTagIds={editingPreset ? editingPreset.tagIds : selectedTagIds}
            allTags={allTags}
            onSave={handleSavePreset}
            onCancel={handleCancelCreator}
            initialName={editingPreset?.name}
            initialDescription={editingPreset?.description}
            initialCategory={editingPreset?.category}
          />
        ) : (
          <Stack gap="md">
            {filteredPresets.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                {searchQuery.trim() ? 'No presets match your search.' : 'No presets in this category yet.'}
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                {filteredPresets.map((preset) => (
                  <PromptWizardPresetCard
                    key={preset.id}
                    name={preset.name}
                    description={preset.description}
                    thumbnail={preset.thumbnail}
                    tagCount={preset.tagIds.length}
                    isDefault={preset.isDefault}
                    onApply={() => onApplyPreset(preset.tagIds)}
                    onEdit={!preset.isDefault ? () => handleEditPreset(preset) : undefined}
                    onDelete={!preset.isDefault ? () => onRemovePreset(preset.id) : undefined}
                  />
                ))}
              </SimpleGrid>
            )}
            <SwarmButton
              tone="secondary"
              emphasis="soft"
              size="compact-sm"
              leftSection={<IconPlus size={14} />}
              onClick={() => setCreatorOpen(true)}
              style={{ alignSelf: 'flex-start' }}
            >
              Create Preset
            </SwarmButton>
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
});
