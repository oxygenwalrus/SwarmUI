import { memo } from 'react';
import {
    Accordion,
    Stack,
    Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SliderWithInput } from '../../../../components/SliderWithInput';
import { SwarmSwitch } from '../../../../components/ui';

export interface VariationAccordionProps {
    form: UseFormReturnType<GenerateParams>;
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
}

/**
 * Variation Seed accordion section.
 * Creates similar but different images using variation seed.
 */
export const VariationAccordion = memo(function VariationAccordion({
    form,
    enabled,
    onToggle,
}: VariationAccordionProps) {
    return (
        <Accordion.Item value="variations">
            <Accordion.Control>Variation Seed</Accordion.Control>
            <Accordion.Panel>
                <Stack gap="md">
                    <SwarmSwitch
                        label="Enable Variation Seed"
                        size="xs"
                        checked={enabled}
                        onChange={(e) => onToggle(e.currentTarget.checked)}
                    />
                    <SliderWithInput
                        label="Variation Seed"
                        value={form.values.variationseed || -1}
                        onChange={(value) => form.setFieldValue('variationseed', value)}
                        min={-1}
                        max={999999999}
                    />

                    <SliderWithInput
                        label="Variation Strength"
                        value={form.values.variationseedstrength || 0}
                        onChange={(value) => form.setFieldValue('variationseedstrength', value)}
                        min={0}
                        max={1}
                        step={0.05}
                        decimalScale={2}
                        marks={[
                            { value: 0, label: '0' },
                            { value: 0.25, label: '0.25' },
                            { value: 0.5, label: '0.5' },
                            { value: 0.75, label: '0.75' },
                        ]}
                    />
                    <Text size="xs" c="invokeGray.3">
                        Creates similar but different images. 0 = don't use, 1 = replace
                        base seed entirely.
                    </Text>
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
});
