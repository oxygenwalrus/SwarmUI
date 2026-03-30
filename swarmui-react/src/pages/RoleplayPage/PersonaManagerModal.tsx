import { Modal, Stack, Text } from '@mantine/core';

interface PersonaManagerModalProps {
    opened: boolean;
    onClose: () => void;
}

/**
 * Modal for managing user personas.
 * Placeholder — full persona CRUD to be implemented.
 */
export function PersonaManagerModal({ opened, onClose }: PersonaManagerModalProps) {
    return (
        <Modal opened={opened} onClose={onClose} title="Persona Manager" size="lg">
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Manage your personas here. Personas define who you are in roleplay sessions,
                    including your name, description, and notes that the AI can reference.
                </Text>
                <Text size="xs" c="dimmed" fs="italic">
                    Full persona editor coming soon.
                </Text>
            </Stack>
        </Modal>
    );
}
