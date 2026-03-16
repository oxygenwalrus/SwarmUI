import { memo } from 'react';
import {
    Accordion,
    Stack,
    Select,
    Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';

export interface ModelAddonsAccordionProps {
    form: UseFormReturnType<GenerateParams>;
    vaeOptions: { value: string; label: string }[];
    loadingVAEs: boolean;
}

/**
 * Model Add-ons (VAE) accordion section.
 */
export const ModelAddonsAccordion = memo(function ModelAddonsAccordion({
    form,
    vaeOptions = [],
    loadingVAEs,
}: ModelAddonsAccordionProps) {
    return (
        <Accordion.Item value="modeladdons">
            <Accordion.Control>Model Add-ons (VAE)</Accordion.Control>
            <Accordion.Panel>
                <Stack gap="md">
                    <Select
                        label="VAE"
                        placeholder={loadingVAEs ? 'Loading VAEs...' : 'Select VAE'}
                        data={vaeOptions}
                        searchable
                        clearable
                        {...form.getInputProps('vae')}
                    />
                    <Text size="xs" c="invokeGray.3">
                        VAE converts between image space and latent space. Auto-select based
                        on model or choose manually.
                    </Text>
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
});
