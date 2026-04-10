import { Group, Text, TextInput } from '@mantine/core';
import { IconFolder, IconX } from '@tabler/icons-react';
import { SwarmActionIcon } from '../../../../components/ui';

interface BatchOutputFolderControlProps {
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
}

/**
 * Control for setting a custom output folder for batch generation.
 */
export function BatchOutputFolderControl({ value, onChange, onClear }: BatchOutputFolderControlProps) {
    return (
        <div>
            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase" mb={4}>
                Output Folder
            </Text>
            <Group gap="xs" wrap="nowrap">
                <IconFolder size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
                <TextInput
                    size="xs"
                    placeholder="Default output folder"
                    value={value}
                    onChange={(e) => onChange(e.currentTarget.value)}
                    style={{ flex: 1 }}
                />
                {value && (
                    <SwarmActionIcon
                        size="sm"
                        tone="secondary"
                        emphasis="ghost"
                        onClick={onClear}
                        aria-label="Clear output folder"
                    >
                        <IconX size={14} />
                    </SwarmActionIcon>
                )}
            </Group>
        </div>
    );
}
