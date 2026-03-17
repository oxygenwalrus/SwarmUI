import { memo } from 'react';
import {
    Accordion,
    Stack,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SliderWithInput } from '../../../../components/SliderWithInput';
import { SamplingSelect } from '../../../../components/ui';
import { useT2IParams } from '../../../../hooks/useT2IParams';

export interface SamplerAccordionProps {
    form: UseFormReturnType<GenerateParams>;
}

/**
 * Sampler & Scheduler accordion section.
 * Options are dynamically loaded from the backend via ListT2IParams,
 * with fallback to local data if the API hasn't responded yet.
 */
export const SamplerAccordion = memo(function SamplerAccordion({
    form,
}: SamplerAccordionProps) {
    const { samplerOptions, schedulerOptions, paramRanges } = useT2IParams();

    const clipRange = paramRanges['clipstopatlayer'];
    const clipMin = clipRange?.min ?? -24;
    const clipMax = clipRange?.max ?? -1;

    return (
        <Accordion.Item value="sampler">
            <Accordion.Control>Sampler & Scheduler</Accordion.Control>
            <Accordion.Panel>
                <Stack gap="md">
                    <SamplingSelect
                        kind="sampler"
                        label="Sampler"
                        data={samplerOptions}
                        searchable
                        {...form.getInputProps('sampler')}
                    />

                    <SamplingSelect
                        kind="scheduler"
                        label="Scheduler"
                        data={schedulerOptions}
                        searchable
                        {...form.getInputProps('scheduler')}
                    />

                    <SliderWithInput
                        label="CLIP Stop At Layer"
                        value={form.values.clipstopatlayer || -1}
                        onChange={(value: number) => form.setFieldValue('clipstopatlayer', value)}
                        min={clipMin}
                        max={clipMax}
                    />
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
});
