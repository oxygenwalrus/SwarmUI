import { useMemo } from 'react';
import {
    Accordion,
    Box,
    Divider,
    Group,
    Modal,
    Paper,
    ScrollArea,
    Stack,
    Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconAlertCircle,
    IconBug,
    IconCheck,
    IconCopy,
    IconPlayerPause,
    IconTrash,
} from '@tabler/icons-react';
import { useGenerationDiagnosticsStore, type GenerationDiagnosticEntry } from '../../stores/generationDiagnosticsStore';
import { SwarmBadge, SwarmButton, type SwarmTone } from '../ui';

interface GenerationDiagnosticsModalProps {
    opened: boolean;
    onClose: () => void;
}

function formatTimestamp(value: number | null): string {
    if (!value) {
        return 'N/A';
    }
    return new Date(value).toLocaleString();
}

function formatDuration(entry: GenerationDiagnosticEntry): string {
    const end = entry.endedAt ?? Date.now();
    const elapsedMs = Math.max(0, end - entry.startedAt);
    if (elapsedMs < 1000) {
        return `${elapsedMs} ms`;
    }
    const seconds = Math.round(elapsedMs / 100) / 10;
    return `${seconds}s`;
}

function statusTone(status: GenerationDiagnosticEntry['status']): SwarmTone {
    switch (status) {
        case 'complete':
            return 'success';
        case 'error':
            return 'danger';
        case 'interrupted':
            return 'warning';
        default:
            return 'info';
    }
}

function statusIcon(status: GenerationDiagnosticEntry['status']) {
    switch (status) {
        case 'complete':
            return <IconCheck size={14} />;
        case 'error':
            return <IconAlertCircle size={14} />;
        case 'interrupted':
            return <IconPlayerPause size={14} />;
        default:
            return <IconBug size={14} />;
    }
}

function prettyJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

async function copyText(label: string, value: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(value);
        notifications.show({
            title: 'Copied',
            message: `${label} copied to clipboard.`,
            color: 'green',
        });
    } catch {
        notifications.show({
            title: 'Copy Failed',
            message: `Could not copy ${label.toLowerCase()} to the clipboard.`,
            color: 'red',
        });
    }
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
    if (value === undefined || value === null) {
        return null;
    }
    return (
        <Stack gap={6}>
            <Text size="xs" fw={600} c="dimmed">
                {label}
            </Text>
            <Box
                component="pre"
                style={{
                    margin: 0,
                    padding: 12,
                    borderRadius: 8,
                    background: 'var(--theme-surface-input)',
                    border: '1px solid var(--theme-border-subtle)',
                    color: 'var(--theme-text-on-input)',
                    fontSize: 12,
                    lineHeight: 1.5,
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}
            >
                {prettyJson(value)}
            </Box>
        </Stack>
    );
}

export function GenerationDiagnosticsModal({
    opened,
    onClose,
}: GenerationDiagnosticsModalProps) {
    const entries = useGenerationDiagnosticsStore((state) => state.entries);
    const clear = useGenerationDiagnosticsStore((state) => state.clear);

    const latestEntry = entries[0] ?? null;
    const runningCount = entries.filter((entry) => entry.status === 'running').length;
    const errorCount = entries.filter((entry) => entry.status === 'error').length;

    const defaultOpenItems = useMemo(
        () => (latestEntry ? [latestEntry.generationId] : []),
        [latestEntry],
    );

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Generation Diagnostics"
            size="xl"
            centered
        >
            <Stack gap="md">
                <Paper p="sm" withBorder radius="md" className="swarm-contrast-panel">
                    <Stack gap="xs">
                        <Group justify="space-between" align="flex-start">
                            <Stack gap={4}>
                                <Text fw={600}>Recent generation traces</Text>
                                <Text size="sm" c="dimmed">
                                    Captures frontend payload normalization, websocket lifecycle, backend request IDs, and server error data across recent generations.
                                </Text>
                            </Stack>
                            <Group gap="xs">
                                <SwarmBadge tone="info">{entries.length} stored</SwarmBadge>
                                <SwarmBadge tone="success">{runningCount} running</SwarmBadge>
                                <SwarmBadge tone="danger">{errorCount} failed</SwarmBadge>
                            </Group>
                        </Group>
                        <Group gap="xs">
                            <SwarmButton
                                size="xs"
                                tone="info"
                                emphasis="soft"
                                leftSection={<IconCopy size={14} />}
                                disabled={!latestEntry}
                                onClick={() => {
                                    if (latestEntry) {
                                        void copyText('Latest diagnostics', prettyJson(latestEntry));
                                    }
                                }}
                            >
                                Copy Latest
                            </SwarmButton>
                            <SwarmButton
                                size="xs"
                                tone="info"
                                emphasis="soft"
                                leftSection={<IconCopy size={14} />}
                                disabled={entries.length === 0}
                                onClick={() => {
                                    void copyText('All diagnostics', prettyJson(entries));
                                }}
                            >
                                Copy All
                            </SwarmButton>
                            <SwarmButton
                                size="xs"
                                tone="danger"
                                emphasis="ghost"
                                leftSection={<IconTrash size={14} />}
                                disabled={entries.length === 0}
                                onClick={() => {
                                    clear();
                                    notifications.show({
                                        title: 'Diagnostics Cleared',
                                        message: 'Recent generation traces were removed.',
                                        color: 'green',
                                    });
                                }}
                            >
                                Clear
                            </SwarmButton>
                        </Group>
                    </Stack>
                </Paper>

                {entries.length === 0 ? (
                    <Paper p="lg" withBorder radius="md" className="swarm-contrast-panel">
                        <Text size="sm" c="dimmed">
                            No generation diagnostics captured yet.
                        </Text>
                    </Paper>
                ) : (
                    <ScrollArea.Autosize mah="70vh" offsetScrollbars>
                        <Accordion multiple defaultValue={defaultOpenItems} variant="separated">
                            {entries.map((entry) => (
                                <Accordion.Item key={entry.generationId} value={entry.generationId}>
                                    <Accordion.Control>
                                        <Group justify="space-between" wrap="nowrap">
                                            <Stack gap={4} style={{ minWidth: 0 }}>
                                                <Group gap="xs" wrap="nowrap">
                                                    <SwarmBadge
                                                        tone={statusTone(entry.status)}
                                                        emphasis="solid"
                                                        leftSection={statusIcon(entry.status)}
                                                    >
                                                        {entry.status}
                                                    </SwarmBadge>
                                                    <Text fw={600} truncate>
                                                        {entry.model || 'Unknown model'}
                                                    </Text>
                                                </Group>
                                                <Text size="xs" c="dimmed" truncate>
                                                    Request {entry.requestId || 'pending'} • Started {formatTimestamp(entry.startedAt)} • Duration {formatDuration(entry)}
                                                </Text>
                                            </Stack>
                                            <Group gap="xs" wrap="nowrap">
                                                <SwarmBadge tone="info">
                                                    {entry.payloadKeys.length} key{entry.payloadKeys.length === 1 ? '' : 's'}
                                                </SwarmBadge>
                                                <SwarmBadge tone="primary">
                                                    {entry.events.length} event{entry.events.length === 1 ? '' : 's'}
                                                </SwarmBadge>
                                            </Group>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="md">
                                            <Group gap="xs">
                                                <SwarmBadge tone="secondary">Gen {entry.generationId}</SwarmBadge>
                                                <SwarmBadge tone="secondary">Request {entry.requestId || 'pending'}</SwarmBadge>
                                                {entry.errorId && (
                                                    <SwarmBadge tone="danger">Error {entry.errorId}</SwarmBadge>
                                                )}
                                                <SwarmBadge tone="info">
                                                    Progress {entry.lastProgress}%
                                                </SwarmBadge>
                                                <SwarmBadge tone="success">
                                                    Images {entry.imagesReceived}
                                                </SwarmBadge>
                                            </Group>

                                            <Group align="flex-start" grow>
                                                <Paper p="sm" withBorder radius="md" className="swarm-contrast-panel">
                                                    <Stack gap={4}>
                                                        <Text size="xs" fw={700} c="dimmed">Summary</Text>
                                                        <Text size="sm">Started: {formatTimestamp(entry.startedAt)}</Text>
                                                        <Text size="sm">Ended: {formatTimestamp(entry.endedAt)}</Text>
                                                        <Text size="sm">Latest phase: {entry.latestPhase || 'N/A'}</Text>
                                                        <Text size="sm">Latest stage: {entry.latestStageLabel || entry.latestStageId || 'N/A'}</Text>
                                                        <Text size="sm">Total steps: {entry.totalSteps ?? 'N/A'}</Text>
                                                        <Text size="sm">Total batches: {entry.totalBatches ?? 'N/A'}</Text>
                                                    </Stack>
                                                </Paper>
                                                <Paper p="sm" withBorder radius="md" className="swarm-contrast-panel">
                                                    <Stack gap={4}>
                                                        <Text size="xs" fw={700} c="dimmed">Frontend payload</Text>
                                                        <Text size="sm">Model: {entry.model || 'N/A'}</Text>
                                                        <Text size="sm">Raw model: {typeof entry.rawModel === 'string' ? entry.rawModel : prettyJson(entry.rawModel)}</Text>
                                                        <Text size="sm">Payload keys: {entry.payloadKeys.join(', ') || 'none'}</Text>
                                                        {entry.omittedParameters.length > 0 && (
                                                            <Text size="sm">
                                                                Omitted keys: {entry.omittedParameters.map((item) => `${item.key} (${item.reason})`).join(', ')}
                                                            </Text>
                                                        )}
                                                    </Stack>
                                                </Paper>
                                            </Group>

                                            {entry.error && (
                                                <Paper
                                                    p="sm"
                                                    withBorder
                                                    radius="md"
                                                    className="swarm-contrast-panel"
                                                    style={{ borderColor: 'var(--theme-tone-danger-border)' }}
                                                >
                                                    <Stack gap={4}>
                                                        <Text size="xs" fw={700} style={{ color: 'var(--theme-error)' }}>Final error</Text>
                                                        <Text size="sm" style={{ color: 'var(--theme-tone-danger-text)' }}>
                                                            {entry.error}
                                                        </Text>
                                                    </Stack>
                                                </Paper>
                                            )}

                                            <JsonBlock label="Payload Summary" value={entry.payloadSummary} />
                                            <JsonBlock label="Raw Value Summary" value={entry.rawValueSummary} />
                                            <JsonBlock label="Omitted Parameters" value={entry.omittedParameters} />
                                            <JsonBlock label="Server Error Data" value={entry.errorData} />

                                            <Divider label="Timeline" labelPosition="center" />

                                            <Stack gap="xs">
                                                {entry.events.length === 0 ? (
                                                    <Text size="sm" c="dimmed">
                                                        No lifecycle events recorded for this attempt.
                                                    </Text>
                                                ) : (
                                                    entry.events.map((event) => (
                                                        <Paper key={event.id} p="sm" withBorder radius="md" className="swarm-contrast-panel">
                                                            <Stack gap={6}>
                                                                <Group justify="space-between" align="center">
                                                                    <Group gap="xs">
                                                                        <SwarmBadge tone={event.level === 'error' ? 'danger' : event.level === 'warn' ? 'warning' : 'info'}>
                                                                            {event.type}
                                                                        </SwarmBadge>
                                                                        <Text size="sm" fw={500}>{event.message}</Text>
                                                                    </Group>
                                                                    <Text size="xs" c="dimmed">
                                                                        +{Math.max(0, event.at - entry.startedAt)}ms
                                                                    </Text>
                                                                </Group>
                                                                {event.details !== undefined && (
                                                                    <JsonBlock label="Event details" value={event.details} />
                                                                )}
                                                            </Stack>
                                                        </Paper>
                                                    ))
                                                )}
                                            </Stack>
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>
                    </ScrollArea.Autosize>
                )}
            </Stack>
        </Modal>
    );
}
