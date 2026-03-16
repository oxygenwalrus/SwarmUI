import { memo } from 'react';
import {
    Card,
    Stack,
    Text,
    MultiSelect,
    Textarea,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';

export interface WildcardPanelProps {
    form: UseFormReturnType<GenerateParams>;
    wildcardOptions: { value: string; label: string }[];
    wildcardText: string;
    onWildcardTextChange: (text: string) => void;
}

/**
 * Wildcard panel for the bottom toolbar.
 * Shows wildcard multi-select and custom syntax input.
 */
export const WildcardPanel = memo(function WildcardPanel({
    form,
    wildcardOptions = [],
    wildcardText,
    onWildcardTextChange,
}: WildcardPanelProps) {
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
                    Wildcards
                </Text>

                <MultiSelect
                    label="Active Wildcards"
                    placeholder="Select Wildcards"
                    data={wildcardOptions}
                    searchable
                    clearable
                    {...form.getInputProps('active_wildcards')}
                />

                <Textarea
                    placeholder="e.g., {color|red|blue|green}"
                    value={wildcardText}
                    onChange={(e) => onWildcardTextChange(e.currentTarget.value)}
                    size="xs"
                    minRows={3}
                    styles={{
                        input: { fontSize: '11px' },
                    }}
                />

                <Text size="xs" c="invokeGray.3">
                    Use {'{'}option1|option2{'}'} syntax or select valid wildcards
                </Text>
            </Stack>
        </Card>
    );
});
