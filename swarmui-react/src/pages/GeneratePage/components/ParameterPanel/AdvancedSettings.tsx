import { memo } from 'react';
import { Accordion, Stack, Select, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SliderWithInput } from '../../../../components/SliderWithInput';
import { useT2IParams } from '../../../../hooks/useT2IParams';

export interface AdvancedSettingsProps {
    form: UseFormReturnType<GenerateParams>;
    vaeOptions: { value: string; label: string }[];
    loadingVAEs: boolean;
}

export const AdvancedSettings = memo(function AdvancedSettings({
    form,
    vaeOptions,
    loadingVAEs,
}: AdvancedSettingsProps) {
    const { paramRanges } = useT2IParams();

    const clipRange = paramRanges['clipstopatlayer'];
    const clipMin = clipRange?.min !== undefined ? Math.max(clipRange.min, -12) : -12;
    const clipMax = clipRange?.max ?? -1;

    return (
        <Accordion
            multiple
            defaultValue={['advanced']}
            styles={{
                item: { backgroundColor: 'var(--mantine-color-invokeGray-9)', border: 'none', marginBottom: 8 },
                control: { padding: 'var(--mantine-spacing-sm)' },
                content: { padding: 'var(--mantine-spacing-sm)', paddingTop: 0 }
            }}
        >
            <Accordion.Item value="advanced">
                <Accordion.Control>
                    <Text size="xs" fw={700} c="invokeGray.0" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                        Advanced
                    </Text>
                </Accordion.Control>
                <Accordion.Panel>
                    <Stack gap="sm">
                        <Select
                            label="VAE"
                            placeholder={loadingVAEs ? 'Loading...' : 'Default'}
                            data={[{ value: '', label: 'None (Default)' }, ...vaeOptions]}
                            searchable
                            clearable
                            size="sm"
                            {...form.getInputProps('vae')}
                            onChange={(value) => form.setFieldValue('vae', value || '')}
                        />

                        <SliderWithInput
                            label="CLIP Skip"
                            tooltip="Number of CLIP layers to skip (clipstopatlayer). -1 is default (none). -2 is common for anime models."
                            value={form.values.clipstopatlayer || -1}
                            onChange={(value: number) => form.setFieldValue('clipstopatlayer', value)}
                            min={clipMin}
                            max={clipMax}
                            marks={[
                                { value: -12, label: '-12' },
                                { value: -2, label: '-2' },
                                { value: -1, label: '-1' }
                            ]}
                        />
                    </Stack>
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    );
});
