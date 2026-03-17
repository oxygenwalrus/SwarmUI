import { memo } from 'react';
import {
    Accordion,
    Stack,
    Select,
    Switch,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SliderWithInput } from '../../../../components/SliderWithInput';
import { useT2IParams } from '../../../../hooks/useT2IParams';

export interface OptionsAccordionProps {
    form: UseFormReturnType<GenerateParams>;
}

/**
 * Additional Options accordion section.
 * Images, batch size, seamless tiling, and save options.
 */
export const OptionsAccordion = memo(function OptionsAccordion({
    form,
}: OptionsAccordionProps) {
    const { paramRanges } = useT2IParams();

    return (
        <Accordion.Item value="options">
            <Accordion.Control>Additional Options</Accordion.Control>
            <Accordion.Panel>
                <Stack gap="md">
                    <SliderWithInput
                        label="Images"
                        value={form.values.images || 1}
                        onChange={(value) => form.setFieldValue('images', value)}
                        min={paramRanges.images?.min ?? 1}
                        max={paramRanges.images?.viewMax ?? paramRanges.images?.max ?? 20}
                        step={paramRanges.images?.step ?? 1}
                    />

                    <SliderWithInput
                        label="Batch Size"
                        value={form.values.batchsize || 1}
                        onChange={(value) => form.setFieldValue('batchsize', value)}
                        min={paramRanges.batchsize?.min ?? 1}
                        max={paramRanges.batchsize?.viewMax ?? paramRanges.batchsize?.max ?? 16}
                        step={paramRanges.batchsize?.step ?? 1}
                    />

                    <Select
                        label="Seamless Tileable"
                        placeholder="None"
                        data={[
                            { value: '', label: 'None' },
                            { value: 'both', label: 'Both' },
                            { value: 'horizontal', label: 'Horizontal' },
                            { value: 'vertical', label: 'Vertical' },
                        ]}
                        {...form.getInputProps('seamlesstileable')}
                        clearable
                    />

                    <Switch
                        label="Remove Background"
                        {...form.getInputProps('removebackground', { type: 'checkbox' })}
                    />

                    <Switch
                        label="Do Not Save"
                        {...form.getInputProps('donotsave', { type: 'checkbox' })}
                    />

                    <Switch
                        label="Don't Save Intermediates"
                        {...form.getInputProps('dontsaveintermediates', { type: 'checkbox' })}
                    />

                    <Switch
                        label="Disable Live Previews"
                        description="Sends SwarmUI's existing nopreviews flag for lighter generation updates."
                        {...form.getInputProps('nopreviews', { type: 'checkbox' })}
                    />
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
});
