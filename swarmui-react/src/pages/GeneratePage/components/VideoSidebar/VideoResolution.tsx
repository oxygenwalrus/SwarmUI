import { Group, NumberInput, Stack, Text } from '@mantine/core';
import { SwarmButton } from '../../../../components/ui';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';

export interface VideoPreset {
    label: string;
    width: number;
    height: number;
}

/**
 * Exported for testing.
 */
export const VIDEO_PRESETS: VideoPreset[] = [
    { label: '16:9', width: 1280, height: 720 },
    { label: '9:16', width: 720, height: 1280 },
    { label: '4:3',  width: 960,  height: 720  },
    { label: '1:1',  width: 512,  height: 512  },
];

/**
 * Returns the preset label matching the given dimensions, or 'Custom' if none match.
 * Exported for testing.
 */
export function getActivePreset(
    width: number,
    height: number,
    presets: VideoPreset[],
): string {
    const match = presets.find(p => p.width === width && p.height === height);
    return match ? match.label : 'Custom';
}

interface VideoResolutionProps {
    form: UseFormReturnType<GenerateParams>;
}

export function VideoResolution({ form }: VideoResolutionProps) {
    const activePreset = getActivePreset(
        form.values.width ?? 0,
        form.values.height ?? 0,
        VIDEO_PRESETS,
    );

    function applyPreset(preset: VideoPreset) {
        form.setFieldValue('width', preset.width);
        form.setFieldValue('height', preset.height);
    }

    return (
        <Stack gap="xs">
            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase">Resolution</Text>
            <Group gap="xs" wrap="wrap">
                {VIDEO_PRESETS.map((preset) => (
                    <SwarmButton
                        key={preset.label}
                        size="xs"
                        tone={activePreset === preset.label ? 'primary' : 'secondary'}
                        emphasis={activePreset === preset.label ? 'filled' : 'soft'}
                        onClick={() => applyPreset(preset)}
                    >
                        {preset.label}
                    </SwarmButton>
                ))}
                <SwarmButton
                    size="xs"
                    tone={activePreset === 'Custom' ? 'primary' : 'secondary'}
                    emphasis={activePreset === 'Custom' ? 'filled' : 'soft'}
                >
                    Custom
                </SwarmButton>
            </Group>
            <Group gap="xs" align="center">
                <NumberInput
                    label="Width"
                    size="sm"
                    style={{ flex: 1 }}
                    min={64}
                    max={2048}
                    step={64}
                    {...form.getInputProps('width')}
                />
                <Text size="sm" c="dimmed" mt={20}>×</Text>
                <NumberInput
                    label="Height"
                    size="sm"
                    style={{ flex: 1 }}
                    min={64}
                    max={2048}
                    step={64}
                    {...form.getInputProps('height')}
                />
            </Group>
        </Stack>
    );
}
