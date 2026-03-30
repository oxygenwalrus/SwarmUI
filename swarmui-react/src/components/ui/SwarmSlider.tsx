import { Slider, type SliderProps } from '@mantine/core';

export interface SwarmSliderProps extends SliderProps {}

export function SwarmSlider(props: SwarmSliderProps) {
    return <Slider {...props} />;
}
