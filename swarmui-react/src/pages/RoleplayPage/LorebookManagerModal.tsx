import { Modal, Stack, Text } from '@mantine/core';

interface LorebookManagerModalProps {
    opened: boolean;
    onClose: () => void;
}

/**
 * Modal for managing lorebooks and their entries.
 * Placeholder — full lorebook CRUD to be implemented.
 */
export function LorebookManagerModal({ opened, onClose }: LorebookManagerModalProps) {
    return (
        <Modal opened={opened} onClose={onClose} title="Lorebook Manager" size="lg">
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Manage your lorebooks and entries here. Create keyword-triggered lore entries
                    that automatically inject relevant context into conversations.
                </Text>
                <Text size="xs" c="dimmed" fs="italic">
                    Full lorebook editor coming soon.
                </Text>
            </Stack>
        </Modal>
    );
}
