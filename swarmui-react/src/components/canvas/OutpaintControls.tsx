import { memo } from 'react';
import {
    Box,
    Stack,
    Group,
    Text,
    Tooltip,
    Divider,
    Paper,
} from '@mantine/core';
import {
    IconChevronUp,
    IconChevronDown,
    IconChevronLeft,
    IconChevronRight,
    IconArrowsMaximize,
    IconRestore,
    IconLayoutAlignCenter,
} from '@tabler/icons-react';
import { useCanvasEditorStore } from '../../stores/canvasEditorStore';
import { SwarmActionIcon, SwarmButton } from '../ui';

interface OutpaintControlsProps {
    onExtend?: (direction: 'top' | 'right' | 'bottom' | 'left', amount: number) => void;
}

const EXTEND_AMOUNTS = [64, 128, 256, 512];

export const OutpaintControls = memo(function OutpaintControls({
    onExtend,
}: OutpaintControlsProps) {
    const {
        canvasWidth,
        canvasHeight,
        originalWidth,
        originalHeight,
        extendCanvas,
        resetCanvasSize,
        centerImage,
    } = useCanvasEditorStore();

    const hasExtended = canvasWidth !== originalWidth || canvasHeight !== originalHeight;

    const handleExtend = (direction: 'top' | 'right' | 'bottom' | 'left', amount: number) => {
        extendCanvas(direction, amount);
        onExtend?.(direction, amount);
    };

    return (
        <Paper p="sm" radius="md" bg="invokeGray.9">
            <Stack gap="md">
                <Group justify="space-between">
                    <Text size="sm" fw={500} c="invokeGray.1">
                        Outpaint Controls
                    </Text>
                    {hasExtended && (
                        <SwarmButton
                            emphasis="ghost"
                            tone="secondary"
                            size="xs"
                            leftSection={<IconRestore size={14} />}
                            onClick={resetCanvasSize}
                        >
                            Reset
                        </SwarmButton>
                    )}
                </Group>

                <Text size="xs" c="invokeGray.4">
                    Canvas: {canvasWidth} x {canvasHeight}
                    {hasExtended && ` (Original: ${originalWidth} x ${originalHeight})`}
                </Text>

                <Text size="xs" c="invokeGray.4">
                    Extend the transparent workspace, then use Move Base to position the image. Empty checkerboard space is auto-masked for outpainting.
                </Text>

                <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                    <Box />
                    <Group gap={2} justify="center">
                        {EXTEND_AMOUNTS.slice(0, 2).map((amount) => (
                            <Tooltip key={`top-${amount}`} label={`Extend top ${amount}px`}>
                                <SwarmActionIcon
                                    size="sm"
                                    emphasis="soft"
                                    tone="secondary"
                                    label={`Extend top ${amount}px`}
                                    onClick={() => handleExtend('top', amount)}
                                >
                                    <Stack gap={0} align="center">
                                        <IconChevronUp size={10} />
                                        <Text size="xs">{amount}</Text>
                                    </Stack>
                                </SwarmActionIcon>
                            </Tooltip>
                        ))}
                    </Group>
                    <Box />

                    <Group gap={2} justify="flex-end">
                        {EXTEND_AMOUNTS.slice(0, 2).map((amount) => (
                            <Tooltip key={`left-${amount}`} label={`Extend left ${amount}px`}>
                                <SwarmActionIcon
                                    size="sm"
                                    emphasis="soft"
                                    tone="secondary"
                                    label={`Extend left ${amount}px`}
                                    onClick={() => handleExtend('left', amount)}
                                >
                                    <Group gap={0}>
                                        <IconChevronLeft size={10} />
                                        <Text size="xs">{amount}</Text>
                                    </Group>
                                </SwarmActionIcon>
                            </Tooltip>
                        ))}
                    </Group>

                    <Box
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 4,
                            backgroundColor: 'var(--mantine-color-invokeGray-8)',
                            borderRadius: 4,
                        }}
                    >
                        <IconArrowsMaximize size={16} color="var(--mantine-color-invokeGray-5)" />
                    </Box>

                    <Group gap={2} justify="flex-start">
                        {EXTEND_AMOUNTS.slice(0, 2).map((amount) => (
                            <Tooltip key={`right-${amount}`} label={`Extend right ${amount}px`}>
                                <SwarmActionIcon
                                    size="sm"
                                    emphasis="soft"
                                    tone="secondary"
                                    label={`Extend right ${amount}px`}
                                    onClick={() => handleExtend('right', amount)}
                                >
                                    <Group gap={0}>
                                        <Text size="xs">{amount}</Text>
                                        <IconChevronRight size={10} />
                                    </Group>
                                </SwarmActionIcon>
                            </Tooltip>
                        ))}
                    </Group>

                    <Box />
                    <Group gap={2} justify="center">
                        {EXTEND_AMOUNTS.slice(0, 2).map((amount) => (
                            <Tooltip key={`bottom-${amount}`} label={`Extend bottom ${amount}px`}>
                                <SwarmActionIcon
                                    size="sm"
                                    emphasis="soft"
                                    tone="secondary"
                                    label={`Extend bottom ${amount}px`}
                                    onClick={() => handleExtend('bottom', amount)}
                                >
                                    <Stack gap={0} align="center">
                                        <Text size="xs">{amount}</Text>
                                        <IconChevronDown size={10} />
                                    </Stack>
                                </SwarmActionIcon>
                            </Tooltip>
                        ))}
                    </Group>
                    <Box />
                </Box>

                <Divider color="invokeGray.7" />

                <SwarmButton
                    size="xs"
                    emphasis="soft"
                    tone="secondary"
                    leftSection={<IconLayoutAlignCenter size={14} />}
                    onClick={centerImage}
                >
                    Center Image
                </SwarmButton>

                <Divider color="invokeGray.7" />

                <Box>
                    <Text size="xs" c="invokeGray.4" mb="xs">
                        Extend all sides:
                    </Text>
                    <Group gap="xs">
                        {EXTEND_AMOUNTS.map((amount) => (
                            <SwarmButton
                                key={amount}
                                size="xs"
                                emphasis="soft"
                                tone="secondary"
                                onClick={() => {
                                    handleExtend('top', amount);
                                    handleExtend('right', amount);
                                    handleExtend('bottom', amount);
                                    handleExtend('left', amount);
                                }}
                            >
                                +{amount}
                            </SwarmButton>
                        ))}
                    </Group>
                </Box>
            </Stack>
        </Paper>
    );
});

export default OutpaintControls;
