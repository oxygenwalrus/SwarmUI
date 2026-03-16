import { memo, useMemo, useState } from 'react';
import {
    Group,
    Select,
    ActionIcon,
    Tooltip,
    Menu,
} from '@mantine/core';
import {
    IconDeviceFloppy,
    IconHistory,
    IconCopy,
    IconTrash,
    IconDotsVertical,
} from '@tabler/icons-react';
import type { Preset } from '../../../../stores/presets';

export interface PresetControlsProps {
    /** Available presets */
    presets: Preset[];
    /** Handler for loading a preset */
    onLoadPreset: (presetId: string) => void;
    /** Handler for opening save preset modal */
    onOpenSaveModal: () => void;
    /** Handler for opening history drawer */
    onOpenHistory: () => void;
    /** Handler for deleting a preset */
    onDeletePreset?: (presetId: string) => void;
    /** Handler for duplicating a preset */
    onDuplicatePreset?: (presetId: string) => void;
}

/**
 * Preset and history controls section.
 * Contains preset dropdown, save button, context menu, and history button.
 */
export const PresetControls = memo(function PresetControls({
    presets = [],
    onLoadPreset,
    onOpenSaveModal,
    onOpenHistory,
    onDeletePreset,
    onDuplicatePreset,
}: PresetControlsProps) {
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

    const presetOptions = useMemo(
        () =>
            presets.map((preset) => ({
                value: preset.id,
                label: preset.name,
            })),
        [presets]
    );

    const handlePresetChange = (value: string | null) => {
        setSelectedPreset(value);
        if (value) {
            onLoadPreset(value);
        }
    };

    return (
        <Group align="flex-end" gap="xs">
            <Select
                label="Preset"
                placeholder="Load preset..."
                data={presetOptions}
                value={selectedPreset}
                onChange={handlePresetChange}
                clearable
                searchable
                style={{ flex: 1 }}
            />
            <Tooltip
                label="Save current generation settings as a reusable preset (excludes prompt text)"
                withArrow
                multiline
                w={280}
            >
                <ActionIcon
                    size="lg"
                    variant="default"
                    onClick={onOpenSaveModal}
                    aria-label="Save Preset"
                >
                    <IconDeviceFloppy size={20} />
                </ActionIcon>
            </Tooltip>
            {selectedPreset && (onDeletePreset || onDuplicatePreset) && (
                <Menu shadow="md" width={160} position="bottom-end">
                    <Menu.Target>
                        <ActionIcon size="lg" variant="default" aria-label="Preset actions">
                            <IconDotsVertical size={18} />
                        </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                        {onDuplicatePreset && (
                            <Menu.Item
                                leftSection={<IconCopy size={16} />}
                                onClick={() => onDuplicatePreset(selectedPreset)}
                            >
                                Duplicate
                            </Menu.Item>
                        )}
                        {onDeletePreset && (
                            <Menu.Item
                                color="red"
                                leftSection={<IconTrash size={16} />}
                                onClick={() => {
                                    onDeletePreset(selectedPreset);
                                    setSelectedPreset(null);
                                }}
                            >
                                Delete
                            </Menu.Item>
                        )}
                    </Menu.Dropdown>
                </Menu>
            )}
            <Tooltip label="View Generation History">
                <ActionIcon
                    size="lg"
                    variant="light"
                    color="violet"
                    onClick={onOpenHistory}
                    aria-label="History"
                >
                    <IconHistory size={20} />
                </ActionIcon>
            </Tooltip>
        </Group>
    );
});
