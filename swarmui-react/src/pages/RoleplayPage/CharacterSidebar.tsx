import { useState } from 'react';
import {
    ActionIcon,
    Group,
    Popover,
    ScrollArea,
    Select,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconPlus,
    IconPlugConnected,
    IconSettings,
    IconTrash,
    IconEdit,
} from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { ElevatedCard } from '../../components/ui/ElevatedCard';
import { SwarmButton } from '../../components/ui/SwarmButton';
import { SwarmBadge } from '../../components/ui/SwarmBadge';
import { useRoleplayStore } from '../../stores/roleplayStore';
import { CharacterEditor } from './CharacterEditor';
import { CharacterAvatar } from './CharacterAvatar';
import type { RoleplayCharacter } from '../../types/roleplay';

interface CharacterSidebarProps {
    onProbeConnection: () => void;
}

export function CharacterSidebar({ onProbeConnection }: CharacterSidebarProps) {
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingCharacter, setEditingCharacter] = useState<RoleplayCharacter | null>(null);
    const [connectionPopoverOpen, setConnectionPopoverOpen] = useState(false);

    const {
        characters,
        activeCharacterId,
        setActiveCharacter,
        removeCharacter,
        connectionStatus,
        connectionMessage,
        lmStudioEndpoint,
        setLmStudioEndpoint,
        selectedModelId,
        setSelectedModelId,
        availableModels,
    } = useRoleplayStore(
        useShallow((s) => ({
            characters: s.characters,
            activeCharacterId: s.activeCharacterId,
            setActiveCharacter: s.setActiveCharacter,
            removeCharacter: s.removeCharacter,
            connectionStatus: s.connectionStatus,
            connectionMessage: s.connectionMessage,
            lmStudioEndpoint: s.lmStudioEndpoint,
            setLmStudioEndpoint: s.setLmStudioEndpoint,
            selectedModelId: s.selectedModelId,
            setSelectedModelId: s.setSelectedModelId,
            availableModels: s.availableModels,
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

    const statusTone = {
        connected: 'success' as const,
        connecting: 'warning' as const,
        error: 'danger' as const,
        idle: 'secondary' as const,
    }[connectionStatus];

    return (
        <Stack h="100%" gap={0}>
            {/* Header */}
            <Group justify="space-between" p="xs" style={{ borderBottom: '1px solid var(--theme-gray-5)' }}>
                <Text size="sm" fw={600} c="var(--theme-text-primary)">
                    Characters
                </Text>
                <Group gap={4}>
                    <Popover
                        opened={connectionPopoverOpen}
                        onChange={setConnectionPopoverOpen}
                        position="bottom-end"
                        shadow="md"
                        withArrow
                    >
                        <Popover.Target>
                            <Tooltip label="Connection settings">
                                <ActionIcon
                                    variant="subtle"
                                    size="sm"
                                    color="gray"
                                    onClick={() => setConnectionPopoverOpen(!connectionPopoverOpen)}
                                >
                                    <IconSettings size={14} />
                                </ActionIcon>
                            </Tooltip>
                        </Popover.Target>
                        <Popover.Dropdown>
                            <Stack gap="xs" w={260}>
                                <Text size="xs" fw={600}>LM Studio Endpoint</Text>
                                <TextInput
                                    size="xs"
                                    value={lmStudioEndpoint}
                                    onChange={(e) => setLmStudioEndpoint(e.currentTarget.value)}
                                    placeholder="http://localhost:1234"
                                />
                                <SwarmButton
                                    size="xs"
                                    tone="brand"
                                    emphasis="solid"
                                    leftSection={<IconPlugConnected size={14} />}
                                    onClick={() => {
                                        onProbeConnection();
                                        setConnectionPopoverOpen(false);
                                    }}
                                >
                                    Test Connection
                                </SwarmButton>
                                {availableModels.length > 0 && (
                                    <>
                                        <Text size="xs" fw={600}>Model</Text>
                                        <Select
                                            size="xs"
                                            value={selectedModelId}
                                            onChange={(v) => v && setSelectedModelId(v)}
                                            data={availableModels.map((m) => ({
                                                value: m.id,
                                                label: m.name,
                                            }))}
                                        />
                                    </>
                                )}
                                {connectionMessage && (
                                    <Text size="xs" c="dimmed">{connectionMessage}</Text>
                                )}
                            </Stack>
                        </Popover.Dropdown>
                    </Popover>
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
            </Group>

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
                                    <CharacterAvatar character={character} size={32} />
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

            {/* Connection Status */}
            <Group p="xs" style={{ borderTop: '1px solid var(--theme-gray-5)' }}>
                <SwarmBadge tone={statusTone} emphasis="subtle" size="xs">
                    {connectionStatus === 'connected' ? 'LM Studio' : connectionStatus}
                </SwarmBadge>
            </Group>

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
