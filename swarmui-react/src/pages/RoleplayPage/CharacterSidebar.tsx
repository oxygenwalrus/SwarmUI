import { useState } from 'react';
import {
    ActionIcon,
    Group,
    ScrollArea,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import {
    IconPlus,
    IconTrash,
    IconEdit,
} from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { ElevatedCard } from '../../components/ui/ElevatedCard';
import { SwarmButton } from '../../components/ui/SwarmButton';
import { useRoleplayStore } from '../../stores/roleplayStore';
import { CharacterEditor } from './CharacterEditor';
import { CharacterAvatar } from './CharacterAvatar';
import type { RoleplayCharacter } from '../../types/roleplay';

export function CharacterSidebar() {
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<RoleplayCharacter | null>(null);

    const {
        characters,
        activeCharacterId,
        setActiveCharacter,
        removeCharacter,
        getActiveCharacter,
    } = useRoleplayStore(
        useShallow((s) => ({
            characters: s.characters,
            activeCharacterId: s.activeCharacterId,
            setActiveCharacter: s.setActiveCharacter,
            removeCharacter: s.removeCharacter,
            getActiveCharacter: s.getActiveCharacter,
        }))
    );

    const handleNewCharacter = () => {
        setEditingCharacter(null);
        setEditorOpen(true);
    };

    const handleEditCharacter = (character: RoleplayCharacter) => {
        setEditingCharacter(character);
        setEditorOpen(true);
    };

    const handleDeleteCharacter = (id: string) => {
        if (characters.length <= 1) return;
        removeCharacter(id);
    };

    return (
        <Stack h="100%" gap={0}>
            {/* Header */}
            <Group justify="space-between" p="xs" style={{ borderBottom: '1px solid var(--theme-gray-5)' }}>
                <Text size="sm" fw={600} c="var(--theme-text-primary)">
                    Characters
                </Text>
                <Tooltip label="New character">
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        color="gray"
                        onClick={handleNewCharacter}
                    >
                        <IconPlus size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>

            {/* Active Character Profile */}
            {(() => {
                const activeChar = getActiveCharacter();
                if (!activeChar) return null;
                return (
                    <Stack align="center" gap="xs" p="md" style={{ borderBottom: '1px solid var(--theme-gray-5)' }}>
                        <CharacterAvatar character={activeChar} size={120} />
                        <Text size="md" fw={700} ta="center">
                            {activeChar.name}
                        </Text>
                        <Text size="xs" c="dimmed" ta="center" lineClamp={3}>
                            {activeChar.personality}
                        </Text>
                        <SwarmButton
                            tone="brand"
                            emphasis="ghost"
                            size="xs"
                            leftSection={<IconEdit size={12} />}
                            onClick={() => handleEditCharacter(activeChar)}
                        >
                            Edit Character
                        </SwarmButton>
                    </Stack>
                );
            })()}

            {/* Character List */}
            <ScrollArea flex={1} p="xs">
                <Stack gap="xs">
                    {characters.map((character) => (
                        <div
                            key={character.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveCharacter(character.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveCharacter(character.id);
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                        <ElevatedCard
                            elevation={character.id === activeCharacterId ? 'raised' : 'paper'}
                            tone={character.id === activeCharacterId ? 'brand' : 'neutral'}
                            interactive
                        >
                            <Group justify="space-between" wrap="nowrap">
                                <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                                    <CharacterAvatar character={character} size={28} />
                                    <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                                        <Text size="sm" fw={600} truncate>
                                            {character.name}
                                        </Text>
                                        <Text size="xs" c="dimmed" lineClamp={1}>
                                            {character.personality}
                                        </Text>
                                    </Stack>
                                </Group>
                                <Group gap={2} wrap="nowrap">
                                    <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        color="gray"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditCharacter(character);
                                        }}
                                    >
                                        <IconEdit size={12} />
                                    </ActionIcon>
                                    {characters.length > 1 && (
                                        <ActionIcon
                                            variant="subtle"
                                            size="xs"
                                            color="red"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteCharacter(character.id);
                                            }}
                                        >
                                            <IconTrash size={12} />
                                        </ActionIcon>
                                    )}
                                </Group>
                            </Group>
                        </ElevatedCard>
                        </div>
                    ))}
                </Stack>
            </ScrollArea>

            {/* Character Editor Modal */}
            <CharacterEditor
                opened={editorOpen}
                onClose={() => {
                    setEditorOpen(false);
                    setEditingCharacter(null);
                }}
                character={editingCharacter}
            />
        </Stack>
    );
}
