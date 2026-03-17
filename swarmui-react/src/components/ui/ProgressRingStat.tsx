import { Center, RingProgress, Stack, Text } from '@mantine/core';

export interface ProgressRingStatProps {
    value: number;
    label: string;
    description?: string;
    color?: string;
    className?: string;
}

export function ProgressRingStat({
    value,
    label,
    description,
    color = 'var(--theme-brand)',
    className,
}: ProgressRingStatProps) {
    const clamped = Math.max(0, Math.min(100, value));

    return (
        <div className={`ui-progress-ring surface-glass ${className ?? ''}`}>
            <Center>
                <RingProgress
                    size={110}
                    thickness={10}
                    roundCaps
                    sections={[{ value: clamped, color }]}
                    label={
                        <Center>
                            <Stack gap={0} align="center">
                                <Text size="lg" fw={700}>
                                    {Math.round(clamped)}%
                                </Text>
                                <Text size="10px" c="var(--theme-gray-2)">
                                    {label}
                                </Text>
                            </Stack>
                        </Center>
                    }
                />
            </Center>
            {description && (
                <Text size="xs" c="var(--theme-gray-2)" ta="center" mt="xs">
                    {description}
                </Text>
            )}
        </div>
    );
}
