import { Select, Stack, Switch, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SliderWithInput } from '../../../../components/SliderWithInput';
import type { VideoWorkflow } from './VideoModelWarning';

const FORMAT_OPTIONS = [
    { value: 'h264-mp4', label: 'H.264 MP4' },
    { value: 'h265-mp4', label: 'H.265 MP4' },
    { value: 'webm',     label: 'WebM'      },
    { value: 'webp',     label: 'WebP'      },
    { value: 'gif',      label: 'GIF'       },
];

interface VideoParametersProps {
    form: UseFormReturnType<GenerateParams>;
    workflow: VideoWorkflow;
}

export function VideoParameters({ form, workflow }: VideoParametersProps) {
    const isI2V = workflow === 'i2v';

    return (
        <Stack gap="sm">
            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase">Video Parameters</Text>

            {/* Frames — T2V and I2V use separate form fields */}
            <SliderWithInput
                label="Frames"
                value={isI2V ? (form.values.videoframes ?? 25) : (form.values.text2videoframes ?? 97)}
                onChange={(value) =>
                    isI2V
                        ? form.setFieldValue('videoframes', value)
                        : form.setFieldValue('text2videoframes', value)
                }
                min={1}
                max={257}
                marks={
                    isI2V
                        ? [{ value: 25, label: '25' }, { value: 121, label: '121' }]
                        : [{ value: 97, label: '97 (LTXV)' }, { value: 73, label: '73 (Hunyuan)' }]
                }
            />

            {/* FPS — T2V and I2V use separate form fields */}
            <SliderWithInput
                label="FPS"
                value={isI2V ? (form.values.videofps ?? 24) : (form.values.text2videofps ?? 24)}
                onChange={(value) =>
                    isI2V
                        ? form.setFieldValue('videofps', value)
                        : form.setFieldValue('text2videofps', value)
                }
                min={1}
                max={60}
                marks={[{ value: 24, label: '24' }]}
            />

            {/* CFG — I2V only (no text2videocfg field exists) */}
            {isI2V && (
                <SliderWithInput
                    label="CFG Scale"
                    value={form.values.videocfg ?? 3.5}
                    onChange={(value) => form.setFieldValue('videocfg', value)}
                    min={1}
                    max={20}
                    step={0.5}
                    decimalScale={1}
                    marks={[{ value: 3.5, label: '3.5' }, { value: 7, label: '7' }]}
                />
            )}

            {/* Format — T2V and I2V use separate form fields */}
            <Select
                label="Format"
                size="sm"
                data={FORMAT_OPTIONS}
                {...(isI2V
                    ? form.getInputProps('videoformat')
                    : form.getInputProps('text2videoformat')
                )}
            />

            {/* Boomerang — I2V only */}
            {isI2V && (
                <Switch
                    label="Boomerang (loop back and forth)"
                    size="xs"
                    {...form.getInputProps('videoboomerang', { type: 'checkbox' })}
                />
            )}
        </Stack>
    );
}
