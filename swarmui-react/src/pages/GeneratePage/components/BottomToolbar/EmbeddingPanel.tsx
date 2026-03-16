import { memo } from 'react';
import {
    Card,
    Stack,
    Text,
    MultiSelect,
} from '@mantine/core';
import { IconLayoutGrid } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SwarmButton } from '../../../../components/ui';

export interface EmbeddingPanelProps {
    form: UseFormReturnType<GenerateParams>;
    embeddingOptions: { value: string; label: string }[];
    onOpenBrowser: () => void;
}

/**
 * Embedding panel for the bottom toolbar.
 * Shows embedding browser button and multi-select.
 */
export const EmbeddingPanel = memo(function EmbeddingPanel({
    form,
    embeddingOptions = [],
    onOpenBrowser,
}: EmbeddingPanelProps) {
    return (
        <Card
            p="md"
            style={{
                flex: 1,
                height: '100%',
                overflow: 'auto',
            }}
        >
            <Stack gap="sm" h="100%">
                <Text
                    size="xs"
                    fw={600}
                    c="invokeGray.0"
                    tt="uppercase"
                    style={{ letterSpacing: '0.5px' }}
                >
                    Embeddings
                </Text>

                <SwarmButton
                    tone="primary"
                    emphasis="soft"
                    size="xs"
                    fullWidth
                    leftSection={<IconLayoutGrid size={14} />}
                    onClick={onOpenBrowser}
                >
                    Browse Embeddings
                </SwarmButton>

                <MultiSelect
                    placeholder="Select Embeddings"
                    data={embeddingOptions}
                    searchable
                    clearable
                    {...form.getInputProps('embeddings')}
                />

                <Text size="xs" c="invokeGray.3">
                    Select embeddings to improve quality
                </Text>
            </Stack>
        </Card>
    );
});
