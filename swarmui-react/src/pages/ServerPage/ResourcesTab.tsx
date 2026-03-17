import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Stack,
    Group,
    Text,
    Card,
    Loader,
    Center,
    Progress,
    SimpleGrid,
    Checkbox,
} from '@mantine/core';
import { IconCpu, IconDeviceDesktop, IconRefresh } from '@tabler/icons-react';
import { swarmClient } from '../../api/client';
import type { ServerResourceInfo } from '../../api/types';
import { useSessionStore } from '../../stores/session';
import { ProgressRingStat, StatTile, SwarmActionIcon } from '../../components/ui';

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getProgressStyles(percent: number) {
    const fill =
        percent > 90
            ? 'var(--theme-tone-danger-bg)'
            : percent > 70
                ? 'var(--theme-tone-warning-bg)'
                : 'var(--theme-progress-fill)';
    const glow =
        percent > 90
            ? 'var(--theme-tone-danger-glow)'
            : percent > 70
                ? 'var(--theme-tone-warning-glow)'
                : 'var(--theme-progress-glow)';

    return {
        root: {
            background: 'var(--theme-progress-track-bg)',
            border: '1px solid var(--theme-progress-track-border)',
        },
        section: {
            background: fill,
            boxShadow: `0 0 10px ${glow}`,
        },
    };
}

export function ResourcesTab() {
    const isInitialized = useSessionStore((s) => s.isInitialized);
    const [resources, setResources] = useState<ServerResourceInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchResources = useCallback(async () => {
        if (!isInitialized) return;
        try {
            const info = await swarmClient.getServerResourceInfo();
            setResources(info);
        } catch {
            // Silently continue
        } finally {
            setLoading(false);
        }
    }, [isInitialized]);

    useEffect(() => {
        if (isInitialized) {
            fetchResources();
        }
    }, [isInitialized, fetchResources]);

    useEffect(() => {
        if (autoRefresh && isInitialized) {
            intervalRef.current = setInterval(fetchResources, 3000);
            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [autoRefresh, isInitialized, fetchResources]);

    if (loading) {
        return <Center h={300}><Loader size="lg" /></Center>;
    }

    if (!resources) {
        return (
            <Center h={300}>
                <Text c="dimmed">Failed to load resource information</Text>
            </Center>
        );
    }

    const ramUsedPercent = resources.system_ram.total > 0
        ? (resources.system_ram.used / resources.system_ram.total) * 100
        : 0;

    const gpuEntries = Object.entries(resources.gpus || {});

    return (
        <Stack gap="md" className="swarm-server-section">
            {/* Controls */}
            <Group justify="flex-end" gap="xs" className="swarm-server-controls">
                <Checkbox
                    label={<Text size="xs">Auto-refresh (3s)</Text>}
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
                    size="xs"
                />
                <SwarmActionIcon
                    tone="secondary"
                    emphasis="soft"
                    label="Refresh resource metrics"
                    onClick={fetchResources}
                >
                    <IconRefresh size={16} />
                </SwarmActionIcon>
            </Group>

            {/* CPU + RAM */}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                <ProgressRingStat
                    value={resources.cpu.usage}
                    label="CPU"
                    description={`${resources.cpu.cores} cores`}
                    color={
                        resources.cpu.usage > 80
                            ? 'var(--theme-error)'
                            : resources.cpu.usage > 50
                                ? 'var(--theme-warning)'
                                : 'var(--theme-brand)'
                    }
                />
                <Card withBorder padding="md" className="surface-glass swarm-resource-card">
                    <Stack gap="xs">
                        <Group justify="space-between">
                            <Text size="sm" fw={600}>System RAM</Text>
                            <Text size="xs" c="dimmed">
                                {formatBytes(resources.system_ram.used)} / {formatBytes(resources.system_ram.total)}
                            </Text>
                        </Group>
                        <Progress
                            value={ramUsedPercent}
                            size="lg"
                            styles={getProgressStyles(ramUsedPercent)}
                            radius="md"
                        />
                        <Text size="xs" c="dimmed">
                            {formatBytes(resources.system_ram.free)} free
                        </Text>
                    </Stack>
                </Card>
                <StatTile
                    label="CPU Cores"
                    value={resources.cpu.cores}
                    icon={<IconCpu size={14} />}
                    tone="neutral"
                />
            </SimpleGrid>

            {/* GPUs */}
            {gpuEntries.length > 0 && (
                <>
                    <Text size="lg" fw={600} mt="md">GPUs</Text>
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                        {gpuEntries.map(([id, gpu]) => {
                            const vramUsedPercent = gpu.total_memory > 0
                                ? (gpu.used_memory / gpu.total_memory) * 100
                                : 0;
                            return (
                                <Card key={id} withBorder padding="md" className="surface-glass swarm-resource-card">
                                    <Stack gap="sm">
                                        <Group justify="space-between">
                                            <Group gap="xs">
                                                <IconDeviceDesktop size={16} />
                                                <Text size="sm" fw={600}>{gpu.name}</Text>
                                            </Group>
                                            <Text size="xs" c="dimmed">GPU #{id}</Text>
                                        </Group>

                                        {/* Temperature */}
                                        <Group justify="space-between">
                                            <Text size="xs">Temperature</Text>
                                            <Text
                                                size="xs"
                                                fw={600}
                                                c={gpu.temperature > 85 ? 'var(--theme-error)' : gpu.temperature > 70 ? 'var(--theme-warning)' : 'var(--theme-text-primary)'}
                                            >
                                                {gpu.temperature}°C
                                            </Text>
                                        </Group>

                                        {/* GPU Utilization */}
                                        <Stack gap={4}>
                                            <Group justify="space-between">
                                                <Text size="xs">GPU Utilization</Text>
                                                <Text size="xs" fw={600}>{gpu.utilization_gpu}%</Text>
                                            </Group>
                                            <Progress
                                                value={gpu.utilization_gpu}
                                                size="sm"
                                                styles={getProgressStyles(gpu.utilization_gpu)}
                                                radius="md"
                                            />
                                        </Stack>

                                        {/* VRAM */}
                                        <Stack gap={4}>
                                            <Group justify="space-between">
                                                <Text size="xs">VRAM</Text>
                                                <Text size="xs" c="dimmed">
                                                    {formatBytes(gpu.used_memory)} / {formatBytes(gpu.total_memory)}
                                                </Text>
                                            </Group>
                                            <Progress
                                                value={vramUsedPercent}
                                                size="sm"
                                                styles={getProgressStyles(vramUsedPercent)}
                                                radius="md"
                                            />
                                            <Text size="xs" c="dimmed">
                                                {formatBytes(gpu.free_memory)} free
                                            </Text>
                                        </Stack>
                                    </Stack>
                                </Card>
                            );
                        })}
                    </SimpleGrid>
                </>
            )}

            {gpuEntries.length === 0 && (
                <Card withBorder padding="md">
                    <Center h={100}>
                        <Text c="dimmed">No GPU information available</Text>
                    </Center>
                </Card>
            )}
        </Stack>
    );
}

