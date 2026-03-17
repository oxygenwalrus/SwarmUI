import { Group, Paper, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';

export type StatTileTone = 'brand' | 'success' | 'warning' | 'error' | 'neutral';

export interface StatTileProps {
    label: string;
    value: string | number;
    hint?: string;
    icon?: ReactNode;
    tone?: StatTileTone;
    className?: string;
}

export function StatTile({
    label,
    value,
    hint,
    icon,
    tone = 'neutral',
    className,
}: StatTileProps) {
    const toneClass = tone === 'neutral' ? '' : `ui-stat-tile--${tone}`;

    return (
        <Paper withBorder className={`ui-stat-tile ${toneClass} fx-hover-lift fx-gradient-sweep ${className ?? ''}`} p="sm" radius="md">
            <Stack gap={2}>
                <Group justify="space-between" align="flex-start">
                    <Text size="xs" fw={600} tt="uppercase" className="ui-stat-label">
                        {label}
                    </Text>
                    {icon && (
                        <Group
                            justify="center"
                            align="center"
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 999,
                                background: 'color-mix(in srgb, var(--theme-accent-soft) 48%, transparent)',
                                border: '1px solid color-mix(in srgb, var(--theme-accent-2) 38%, transparent)',
                            }}
                        >
                            {icon}
                        </Group>
                    )}
                </Group>
                <Text size="xl" fw={700} className="ui-stat-value">
                    {value}
                </Text>
                {hint && (
                    <Text size="xs" c="var(--theme-text-secondary)">
                        {hint}
                    </Text>
                )}
            </Stack>
        </Paper>
    );
}
