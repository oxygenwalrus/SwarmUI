import { useMemo, useState } from 'react';
import {
  Badge,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { ElevatedCard } from '../../components/ui/ElevatedCard';
import { SwarmButton } from '../../components/ui/SwarmButton';
import { useRoleplayStore } from '../../stores/roleplayStore';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterEditor } from './CharacterEditor';
import type { RoleplayCharacter } from '../../types/roleplay';

interface CharacterSelectionPanelProps {
  onSelectCharacter: () => void;
}

/**
 * Character selection / entry surface for the roleplay page.
 * Shows a searchable grid of existing characters, a "New Character"
 * action, and routes into the chat layout once a character is picked.
 */
export function CharacterSelectionPanel({ onSelectCharacter }: CharacterSelectionPanelProps) {
  const [search, setSearch] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);

  const {
    characters,
    chatSessions,
    activeCharacterId,
    setActiveCharacter,
    setActiveSession,
    createSession,
  } = useRoleplayStore(
    useShallow((s) => ({
      characters: s.characters,
      chatSessions: s.chatSessions,
      activeCharacterId: s.activeCharacterId,
      setActiveCharacter: s.setActiveCharacter,
      setActiveSession: s.setActiveSession,
      createSession: s.createSession,
    }))
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return characters;
    return characters.filter((character) => {
      const haystack = [
        character.name,
        character.personality,
        character.description,
        character.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [characters, search]);

  const handleSelect = (character: RoleplayCharacter) => {
    setActiveCharacter(character.id);

    const characterSessions = chatSessions
      .filter((session) => session.characterId === character.id)
      .sort((left, right) => right.updatedAt - left.updatedAt);

    if (characterSessions.length > 0) {
      setActiveSession(characterSessions[0].id);
    } else {
      createSession(character.id, 'Main Chat');
    }

    onSelectCharacter();
  };

  return (
    <Stack gap="md" p="md" h="100%" style={{ overflow: 'hidden' }}>
      <Group justify="space-between" wrap="nowrap">
        <Stack gap={2}>
          <Text size="lg" fw={700}>
            Choose a Character
          </Text>
          <Text size="xs" c="dimmed">
            Pick an existing character to continue a chat, or create a new one.
          </Text>
        </Stack>
        <SwarmButton
          tone="brand"
          emphasis="solid"
          leftSection={<IconPlus size={14} />}
          onClick={() => setEditorOpen(true)}
        >
          New Character
        </SwarmButton>
      </Group>

      <TextInput
        placeholder="Search characters"
        leftSection={<IconSearch size={14} />}
        value={search}
        onChange={(event) => setSearch(event.currentTarget.value)}
      />

      <ScrollArea flex={1}>
        {filtered.length === 0 ? (
          <Stack align="center" gap="xs" py="xl">
            <Text size="sm" c="dimmed">
              {characters.length === 0
                ? 'No characters yet. Create one to get started.'
                : 'No characters match your search.'}
            </Text>
          </Stack>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {filtered.map((character) => {
              const sessionCount = chatSessions.filter(
                (session) => session.characterId === character.id
              ).length;
              const isActive = character.id === activeCharacterId;
              return (
                <ElevatedCard
                  key={character.id}
                  elevation={isActive ? 'raised' : 'paper'}
                  tone={isActive ? 'brand' : 'neutral'}
                  interactive
                  onClick={() => handleSelect(character)}
                >
                  <Stack gap="xs" align="center">
                    <CharacterAvatar character={character} size={80} />
                    <Text size="sm" fw={700} ta="center" lineClamp={1}>
                      {character.name}
                    </Text>
                    <Text size="xs" c="dimmed" ta="center" lineClamp={3}>
                      {character.personality || character.description || 'No description.'}
                    </Text>
                    <Group gap={4} justify="center" wrap="wrap">
                      <Badge size="xs" variant="light">
                        {sessionCount} {sessionCount === 1 ? 'chat' : 'chats'}
                      </Badge>
                      {character.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} size="xs" variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </Group>
                  </Stack>
                </ElevatedCard>
              );
            })}
          </SimpleGrid>
        )}
      </ScrollArea>

      <CharacterEditor
        opened={editorOpen}
        onClose={() => setEditorOpen(false)}
        character={null}
      />
    </Stack>
  );
}
