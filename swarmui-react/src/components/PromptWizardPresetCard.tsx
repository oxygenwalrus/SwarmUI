import { memo } from 'react';
import { Group, Text } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { ElevatedCard, SwarmActionIcon, SwarmBadge, SwarmButton } from './ui';

interface PromptWizardPresetCardProps {
  name: string;
  description?: string;
  thumbnail?: string;
  tagCount: number;
  isDefault: boolean;
  onApply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PromptWizardPresetCard = memo(function PromptWizardPresetCard({
  name,
  description,
  thumbnail,
  tagCount,
  isDefault,
  onApply,
  onEdit,
  onDelete,
}: PromptWizardPresetCardProps) {
  return (
    <ElevatedCard
      elevation="paper"
      withBorder
      style={{
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 100,
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          {thumbnail && <Text size="lg">{thumbnail}</Text>}
          <Text fw={600} size="sm" lineClamp={1}>{name}</Text>
        </Group>
        <SwarmBadge tone="secondary" emphasis="soft">
          {tagCount} {tagCount === 1 ? 'tag' : 'tags'}
        </SwarmBadge>
      </Group>
      {description && (
        <Text size="xs" c="dimmed" lineClamp={1}>{description}</Text>
      )}
      <Group gap="xs" mt="auto">
        <SwarmButton tone="primary" emphasis="soft" size="compact-xs" onClick={onApply} style={{ flex: 1 }}>
          Apply
        </SwarmButton>
        {!isDefault && onEdit && (
          <SwarmActionIcon tone="secondary" emphasis="ghost" onClick={onEdit} label="Edit preset">
            <IconEdit size={14} />
          </SwarmActionIcon>
        )}
        {!isDefault && onDelete && (
          <SwarmActionIcon tone="danger" emphasis="ghost" onClick={onDelete} label="Delete preset">
            <IconTrash size={14} />
          </SwarmActionIcon>
        )}
      </Group>
    </ElevatedCard>
  );
});
