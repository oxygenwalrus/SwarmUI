import { memo } from 'react';
import { Group, Select, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconSearch, IconSparkles, IconX } from '@tabler/icons-react';
import { SwarmActionIcon, SwarmBadge } from './ui';
import { PROFILES } from '../features/promptWizard/profiles';

interface PromptWizardHeaderProps {
  activeProfileId: string;
  onProfileChange: (profileId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalSelected: number;
  onClose: () => void;
}

export const PromptWizardHeader = memo(function PromptWizardHeader({
  activeProfileId,
  onProfileChange,
  searchQuery,
  onSearchChange,
  totalSelected,
  onClose,
}: PromptWizardHeaderProps) {
  return (
    <Stack gap="md" px="lg" py="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', background: 'linear-gradient(180deg, color-mix(in srgb, var(--elevation-raised) 82%, transparent), transparent)' }}>
      <Group justify="space-between" align="flex-start">
        <Group align="flex-start" gap="sm">
          <ThemeIcon size={42} radius="md" variant="light" color="gray" style={{ backgroundColor: 'var(--elevation-paper)' }}>
            <IconSparkles size={20} />
          </ThemeIcon>
          <Stack gap={3}>
            <Group gap="xs">
              <Text fw={700} size="lg">Prompt Wizard</Text>
              <SwarmBadge tone={totalSelected > 0 ? 'primary' : 'secondary'} emphasis="soft">
                {totalSelected > 0 ? `${totalSelected} tags` : 'Ready'}
              </SwarmBadge>
            </Group>
            <Text size="sm" c="dimmed">Build prompts step by step with model-appropriate tag ordering.</Text>
          </Stack>
        </Group>
        <SwarmActionIcon tone="secondary" emphasis="ghost" onClick={onClose} label="Close prompt wizard">
          <IconX size={18} />
        </SwarmActionIcon>
      </Group>
      <Group align="stretch" gap="sm">
        <TextInput
          placeholder="Search tags across all steps..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          data={PROFILES.map((p) => ({ value: p.id, label: p.name }))}
          value={activeProfileId}
          onChange={(value) => value && onProfileChange(value)}
          style={{ width: 220 }}
        />
      </Group>
    </Stack>
  );
});
