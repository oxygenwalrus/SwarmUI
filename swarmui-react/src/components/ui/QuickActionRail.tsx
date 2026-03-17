import { Group, Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';
import { SwarmButton } from './SwarmButton';
import type { SwarmEmphasis, SwarmTone } from './swarmTones';

export interface QuickActionItem {
    id: string;
    label: string;
    icon?: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    tone?: SwarmTone;
    // Compatibility shim for one migration cycle.
    color?: string;
    emphasis?: SwarmEmphasis;
    variant?: 'filled' | 'light' | 'outline' | 'subtle';
    tooltip?: string;
}

export interface QuickActionRailProps {
    actions: QuickActionItem[];
    className?: string;
}

export function QuickActionRail({ actions, className }: QuickActionRailProps) {
    return (
        <Group className={`ui-quick-action-rail ${className ?? ''}`} gap="xs">
            {actions.map((action) => {
                const button = (
                    <SwarmButton
                        key={action.id}
                        size="xs"
                        className="fx-hover-lift fx-gradient-sweep"
                        tone={action.tone}
                        color={action.color}
                        emphasis={action.emphasis}
                        variant={action.variant || 'light'}
                        leftSection={action.icon}
                        onClick={action.onClick}
                        disabled={action.disabled}
                    >
                        {action.label}
                    </SwarmButton>
                );

                if (!action.tooltip) {
                    return button;
                }

                return (
                    <Tooltip key={action.id} label={action.tooltip}>
                        {button}
                    </Tooltip>
                );
            })}
        </Group>
    );
}
