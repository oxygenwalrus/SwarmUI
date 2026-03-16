import { Box, Group, Stack, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { SwarmBadge, type SwarmBadgeProps } from './SwarmBadge';
import type { SwarmEmphasis, SwarmTone } from './swarmTones';

export interface SectionHeroBadge {
    label: string;
    tone?: SwarmTone;
    emphasis?: SwarmEmphasis;
    contrast?: SwarmBadgeProps['contrast'];
    // Compatibility shim for one migration cycle.
    color?: string;
    variant?: 'filled' | 'light' | 'outline' | 'dot';
}

export interface SectionHeroProps {
    title: string;
    subtitle?: string;
    icon?: ReactNode;
    badges?: SectionHeroBadge[];
    rightSection?: ReactNode;
    callout?: ReactNode;
    className?: string;
    children?: ReactNode;
    variant?: 'default' | 'compact' | 'subtle';
}

export function SectionHero({
    title,
    subtitle,
    icon,
    badges = [],
    rightSection,
    callout,
    className,
    children,
    variant = 'default',
}: SectionHeroProps) {
    return (
        <Box className={`ui-hero ui-hero--${variant} surface-gradient-border fx-reveal ${className ?? ''}`}>
            <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                <Stack gap={6}>
                    <Group gap="xs">
                        {icon}
                        <Text size="lg" fw={700} className="text-gradient-accent tracking-tight">
                            {title}
                        </Text>
                    </Group>
                    {subtitle && (
                        <Text size="sm" c="var(--theme-text-secondary)">
                            {subtitle}
                        </Text>
                    )}
                    {badges.length > 0 && (
                        <Group gap="xs">
                            {badges.map((badge) => (
                                <SwarmBadge
                                    key={badge.label}
                                    size="sm"
                                    tone={badge.tone}
                                    emphasis={badge.emphasis}
                                    contrast={badge.contrast}
                                    color={badge.color}
                                    variant={badge.variant || 'dot'}
                                >
                                    {badge.label}
                                </SwarmBadge>
                            ))}
                        </Group>
                    )}
                </Stack>
                {rightSection}
            </Group>

            {(callout || children) && (
                <Stack gap="sm" mt="md">
                    {callout && <Box className="ui-callout fx-gradient-sweep">{callout}</Box>}
                    {children}
                </Stack>
            )}
        </Box>
    );
}
