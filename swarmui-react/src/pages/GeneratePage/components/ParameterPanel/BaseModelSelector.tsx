import { memo } from 'react';
import { Accordion, Group, Select, Text } from '@mantine/core';
import { IconDatabase } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams, Model } from '../../../../api/types';

export interface BaseModelSelectorProps {
    form: UseFormReturnType<GenerateParams>;
    models: Model[];
    loadingModels: boolean;
    loadingModel: boolean;
    onModelSelect: (modelName: string | null) => void;
}

export const BaseModelSelector = memo(function BaseModelSelector({
    form,
    models,
    loadingModels,
    loadingModel,
    onModelSelect,
}: BaseModelSelectorProps) {
    return (
        <Accordion
            multiple
            variant="contained"
            defaultValue={['base-model']}
            styles={{
                item: { backgroundColor: 'var(--mantine-color-invokeGray-9)', border: 'none', marginBottom: 8 },
                control: { padding: 'var(--mantine-spacing-sm)' },
                content: { padding: 'var(--mantine-spacing-sm)', paddingTop: 0 }
            }}
        >
            <Accordion.Item value="base-model">
                <Accordion.Control>
                    <Group gap={6}>
                        <IconDatabase size={16} color="var(--mantine-color-invokeGray-2)" />
                        <Text size="xs" fw={700} c="invokeGray.0" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                            Base Model
                        </Text>
                    </Group>
                </Accordion.Control>
                <Accordion.Panel>
                    <Select
                        placeholder={loadingModels ? 'Loading models...' : 'Select a checkpoint'}
                        data={models.map((model) => ({
                            value: model.name,
                            label: model.title || model.name,
                            disabled: !model.loaded,
                        }))}
                        searchable
                        size="sm"
                        maxDropdownHeight={350}
                        {...form.getInputProps('model')}
                        onChange={onModelSelect}
                        disabled={loadingModel}
                    />
                </Accordion.Panel>
            </Accordion.Item>
        </Accordion>
    );
});
