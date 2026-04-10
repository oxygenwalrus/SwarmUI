// QualityPreset.tsx
import { SegmentedControl, Stack, Text } from '@mantine/core';
import type { QualityTier } from './videoModelProfiles';

interface QualityPresetProps {
    value: QualityTier | null; // null = custom (user overrode values)
    onChange: (tier: QualityTier) => void;
}

const QUALITY_DATA = [
    { value: 'draft', label: 'Draft' },
    { value: 'standard', label: 'Standard' },
    { value: 'high', label: 'High' },
] as const;

export function QualityPreset({ value, onChange }: QualityPresetProps) {
    return (
        <Stack gap="xs">
            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase">Quality</Text>
            <SegmentedControl
                value={value ?? ''}
                onChange={(val) => {
                    if (val === 'draft' || val === 'standard' || val === 'high') {
                        onChange(val);
                    }
                }}
                data={[...QUALITY_DATA]}
                fullWidth
                size="sm"
            />
            {value === 'draft' && (
                <Text size="xs" c="dimmed">
                    Faster preview with fewer frames and steps.
                </Text>
            )}
            {value === null && (
                <Text size="xs" c="dimmed">
                    Custom — manual settings in Advanced override the preset.
                </Text>
            )}
        </Stack>
    );
}
