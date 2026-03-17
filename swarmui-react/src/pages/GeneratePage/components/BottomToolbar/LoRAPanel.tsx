import { memo } from 'react';
import {
    Card,
    Stack,
    Group,
    Text,
    ScrollArea,
    Tooltip,
} from '@mantine/core';
import { IconLayoutGrid } from '@tabler/icons-react';
import type { LoRASelection } from '../../../../api/types';
import { SwarmBadge, SwarmButton } from '../../../../components/ui';

export interface LoRAPanelProps {
    activeLoras: LoRASelection[];
    onOpenBrowser: () => void;
}

/**
 * LoRA panel for the bottom toolbar.
 * Shows active LoRAs and browse button.
 */
export const LoRAPanel = memo(function LoRAPanel({
    activeLoras = [],
    onOpenBrowser,
}: LoRAPanelProps) {
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
                    LoRAs
                </Text>

                <SwarmButton
                    tone="primary"
                    emphasis="soft"
                    size="xs"
                    fullWidth
                    leftSection={<IconLayoutGrid size={14} />}
                    onClick={onOpenBrowser}
                >
                    Browse LoRAs
                </SwarmButton>

                {activeLoras.length > 0 ? (
                    <ScrollArea style={{ flex: 1 }}>
                        <Stack gap={4}>
                            {activeLoras.map((lora, idx) => (
                                <Group key={idx} gap={4} justify="space-between">
                                    <Tooltip label={lora.lora}>
                                        <Text size="xs" truncate style={{ flex: 1 }}>
                                            {lora.lora.split('/').pop() || lora.lora}
                                        </Text>
                                    </Tooltip>
                                    <SwarmBadge size="xs" tone="info" emphasis="soft">
                                        {lora.weight.toFixed(2)}
                                    </SwarmBadge>
                                </Group>
                            ))}
                        </Stack>
                    </ScrollArea>
                ) : (
                    <Text size="xs" c="invokeGray.3" ta="center">
                        No LoRAs selected
                    </Text>
                )}
            </Stack>
        </Card>
    );
});
