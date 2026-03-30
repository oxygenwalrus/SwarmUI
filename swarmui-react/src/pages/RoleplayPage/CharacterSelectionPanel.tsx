import { Stack, Text } from '@mantine/core';
import { SwarmButton } from '../../components/ui';

interface CharacterSelectionPanelProps {
    onSelectCharacter: () => void;
}

/**
 * Character selection panel — placeholder for the character picker UI.
 */
export function CharacterSelectionPanel({ onSelectCharacter }: CharacterSelectionPanelProps) {
    return (
        <Stack gap="md" p="md" align="center" justify="center" h="100%">
            <Text size="lg" fw={600}>Select a Character</Text>
            <Text size="sm" c="dimmed">
                Choose a character from your library to start a roleplay session.
            </Text>
            <SwarmButton tone="primary" emphasis="solid" onClick={onSelectCharacter}>
                Use Default Character
            </SwarmButton>
        </Stack>
    );
}
