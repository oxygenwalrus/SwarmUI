import { Group, Text } from '@mantine/core';

export type StatusTimelineState = 'complete' | 'active' | 'pending' | 'error';

export interface StatusTimelineStep {
    label: string;
    state: StatusTimelineState;
}

export interface StatusTimelineProps {
    steps: StatusTimelineStep[];
    className?: string;
}

export function StatusTimeline({ steps, className }: StatusTimelineProps) {
    if (steps.length === 0) {
        return null;
    }

    return (
        <Group gap="xs" wrap="nowrap" className={`ui-status-timeline fx-gradient-sweep ${className ?? ''}`}>
            {steps.map((step, index) => (
                <Group key={step.label} gap="xs" wrap="nowrap" style={{ flex: index === steps.length - 1 ? undefined : 1 }}>
                    <Group gap={6} wrap="nowrap">
                        <div
                            className={`step-indicator-item ${step.state === 'complete' ? 'completed' : ''} ${step.state === 'active' ? 'active' : ''}`}
                            style={
                                step.state === 'error'
                                    ? {
                                        backgroundColor: 'var(--theme-error)',
                                        color: 'var(--theme-error-text)',
                                    }
                                    : undefined
                            }
                        >
                            {index + 1}
                        </div>
                        <Text size="xs" c={step.state === 'pending' ? 'var(--theme-gray-3)' : 'var(--theme-text-secondary)'}>
                            {step.label}
                        </Text>
                    </Group>
                    {index < steps.length - 1 && (
                        <div
                            className={`step-indicator-connector ${step.state === 'complete' ? 'completed' : ''}`}
                            style={{
                                minWidth: 18,
                                background: step.state === 'complete'
                                    ? 'linear-gradient(90deg, var(--theme-success), color-mix(in srgb, var(--theme-success) 70%, transparent))'
                                    : undefined,
                            }}
                        />
                    )}
                </Group>
            ))}
        </Group>
    );
}
