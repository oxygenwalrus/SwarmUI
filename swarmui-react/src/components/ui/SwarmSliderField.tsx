import { Stack, Text, Slider, type SliderProps } from '@mantine/core';

export interface SwarmSliderFieldProps extends SliderProps {
    label?: string;
}

export function SwarmSliderField({ label, ...props }: SwarmSliderFieldProps) {
    return (
        <Stack gap={4}>
            {label && <Text size="sm">{label}</Text>}
            <Slider {...props} />
        </Stack>
    );
}
