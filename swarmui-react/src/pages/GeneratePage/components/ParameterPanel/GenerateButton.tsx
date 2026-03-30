import { lazy, memo, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Box, Group, Popover, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconPlayerPlay, IconPlayerPause, IconPlus, IconSparkles, IconStack2, IconUpload } from '@tabler/icons-react';
import { ContextMenu, useContextMenu, type ContextMenuItem } from '../../../../components/ContextMenu';
import { SwarmActionIcon, SwarmButton } from '../../../../components/ui';
import type { GenerateParams, Model } from '../../../../api/types';
import type { QualityCoachAnalysis, QualityCoachSeverity } from '../../utils/qualityCoach';

const QualityCoachLearningPanel = lazy(() => import('./QualityCoachLearningPanel').then((module) => ({ default: module.QualityCoachLearningPanel })));

export interface GenerateButtonProps {
    generating: boolean;
    onStop: () => void;
    onOpenSchedule: () => void;
    onGenerateVariations?: (count: number) => void;
    onGenerateAndUpscale?: () => void;
    qualityCoach?: QualityCoachAnalysis;
    onApplyQualityCoachFixes?: (overrides: Partial<GenerateParams>) => void;
    currentValues?: Partial<GenerateParams>;
    selectedModel?: Model | null;
    disabled?: boolean;
    disabledReason?: string;
}

function getSeverityColor(severity: QualityCoachSeverity): string {
    if (severity === 'high-risk') return 'red';
    if (severity === 'caution') return 'yellow';
    return 'green';
}

function getSeveritySurface(severity: QualityCoachSeverity): { border: string; background: string } {
    if (severity === 'high-risk') {
        return {
            border: '1px solid color-mix(in srgb, var(--mantine-color-red-6) 38%, transparent)',
            background: 'color-mix(in srgb, var(--mantine-color-red-9) 15%, transparent)',
        };
    }
    if (severity === 'caution') {
        return {
            border: '1px solid color-mix(in srgb, var(--mantine-color-yellow-6) 38%, transparent)',
            background: 'color-mix(in srgb, var(--mantine-color-yellow-9) 18%, transparent)',
        };
    }
    return {
        border: '1px solid color-mix(in srgb, var(--mantine-color-green-6) 32%, transparent)',
        background: 'color-mix(in srgb, var(--mantine-color-green-9) 16%, transparent)',
    };
}

export const GenerateButton = memo(function GenerateButton({
    generating,
    onStop,
    onOpenSchedule,
    onGenerateVariations,
    onGenerateAndUpscale,
    qualityCoach,
    onApplyQualityCoachFixes,
    currentValues,
    selectedModel,
    disabled,
    disabledReason,
}: GenerateButtonProps) {
    const contextMenu = useContextMenu();
    const [coachOpened, setCoachOpened] = useState(false);
    const [resolvedQualityCoach, setResolvedQualityCoach] = useState<QualityCoachAnalysis | null>(qualityCoach ?? null);
    const [coachLoading, setCoachLoading] = useState(false);
    const deferredCurrentValues = useDeferredValue(currentValues);
    const analyzeRef = useRef<((values: Partial<GenerateParams>, model: Model | null) => QualityCoachAnalysis) | null>(null);

    const generateMenuItems: ContextMenuItem[] = [
        {
            id: 'generate',
            label: 'Generate',
            icon: <IconPlayerPlay size={16} />,
            onClick: () => {
                const form = document.querySelector('form');
                if (form) form.requestSubmit();
            },
        },
        {
            id: 'generate-4',
            label: 'Generate 4 Variations',
            icon: <IconStack2 size={16} />,
            onClick: () => onGenerateVariations?.(4),
            disabled: !onGenerateVariations,
        },
        { id: 'divider-1', label: '', divider: true, onClick: () => { } },
        {
            id: 'add-queue',
            label: 'Add to Queue',
            icon: <IconPlus size={16} />,
            shortcut: 'Shift+Enter',
            onClick: onOpenSchedule,
        },
        {
            id: 'generate-upscale',
            label: 'Generate & Auto-Upscale',
            icon: <IconUpload size={16} />,
            onClick: () => onGenerateAndUpscale?.(),
            disabled: !onGenerateAndUpscale,
        },
    ];

    useEffect(() => {
        if (qualityCoach) {
            setResolvedQualityCoach(qualityCoach);
        }
    }, [qualityCoach]);

    useEffect(() => {
        if (!analyzeRef.current || qualityCoach) {
            return;
        }
        setResolvedQualityCoach(analyzeRef.current(deferredCurrentValues ?? {}, selectedModel ?? null));
    }, [deferredCurrentValues, qualityCoach, selectedModel]);

    const ensureQualityCoach = useCallback(async () => {
        if (qualityCoach) {
            setResolvedQualityCoach(qualityCoach);
            return qualityCoach;
        }
        if (analyzeRef.current) {
            const nextCoach = analyzeRef.current(deferredCurrentValues ?? {}, selectedModel ?? null);
            setResolvedQualityCoach(nextCoach);
            return nextCoach;
        }

        setCoachLoading(true);
        try {
            const module = await import('../../utils/qualityCoach');
            analyzeRef.current = module.analyzeGenerateQuality;
            const nextCoach = module.analyzeGenerateQuality(deferredCurrentValues ?? {}, selectedModel ?? null);
            setResolvedQualityCoach(nextCoach);
            return nextCoach;
        } finally {
            setCoachLoading(false);
        }
    }, [deferredCurrentValues, qualityCoach, selectedModel]);

    const leadingHealthBadges = useMemo(
        () => resolvedQualityCoach?.parameterHealth.slice(0, 4) ?? [],
        [resolvedQualityCoach]
    );

    if (generating) {
        return (
            <SwarmButton
                tone="danger"
                emphasis="solid"
                size="lg"
                fullWidth
                className="gradient-button-danger"
                leftSection={<IconPlayerPause size={18} />}
                onClick={onStop}
            >
                Stop Generation
            </SwarmButton>
        );
    }

    const overallSeverity = resolvedQualityCoach?.overallSeverity ?? 'balanced';
    const severityColor = getSeverityColor(overallSeverity);
    const summarySurface = getSeveritySurface(overallSeverity);

    return (
        <>
            <Stack gap="xs">
                <Group align="stretch" gap="xs" wrap="nowrap">
                    <Tooltip
                        label={disabledReason ?? 'Cannot generate'}
                        disabled={!disabled}
                        withArrow
                    >
                        <SwarmButton
                            type="submit"
                            size="lg"
                            fullWidth
                            tone="primary"
                            emphasis="solid"
                            className="gradient-button with-glow"
                            leftSection={<IconPlayerPlay size={18} />}
                            onContextMenu={disabled ? undefined : contextMenu.open}
                            style={{ flex: '1 1 auto', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : undefined }}
                            disabled={disabled}
                        >
                            Generate
                        </SwarmButton>
                    </Tooltip>

                    <Popover
                        opened={coachOpened}
                        onChange={(opened) => {
                            setCoachOpened(opened);
                            if (opened) {
                                void ensureQualityCoach();
                            }
                        }}
                        width={760}
                        position="top-end"
                        withArrow
                        shadow="md"
                        withinPortal
                    >
                        <Popover.Target>
                            <Tooltip label="Open the Stable Diffusion learning engine and live quality coach.">
                                <SwarmActionIcon
                                    size="lg"
                                    tone={resolvedQualityCoach?.overallSeverity === 'high-risk' ? 'danger' : resolvedQualityCoach?.overallSeverity === 'caution' ? 'warning' : 'info'}
                                    emphasis={resolvedQualityCoach?.overallSeverity !== 'balanced' ? 'solid' : 'soft'}
                                    onClick={() => {
                                        setCoachOpened((opened) => !opened);
                                        void ensureQualityCoach();
                                    }}
                                    onMouseEnter={() => {
                                        void ensureQualityCoach();
                                    }}
                                    aria-label="Open Quality Coach"
                                    style={{ alignSelf: 'stretch', minWidth: 48 }}
                                >
                                    <IconSparkles size={18} />
                                </SwarmActionIcon>
                            </Tooltip>
                        </Popover.Target>
                        <Popover.Dropdown>
                            {resolvedQualityCoach ? (
                                <Suspense fallback={<Text size="sm" c="dimmed">Loading quality coach...</Text>}>
                                    <QualityCoachLearningPanel
                                        qualityCoach={resolvedQualityCoach}
                                        currentValues={currentValues}
                                        onApplyValues={onApplyQualityCoachFixes}
                                        onClose={() => setCoachOpened(false)}
                                    />
                                </Suspense>
                            ) : (
                                <Text size="sm" c="dimmed">
                                    {coachLoading ? 'Loading quality coach...' : 'Open the coach to load diagnostics and learning tools.'}
                                </Text>
                            )}
                        </Popover.Dropdown>
                    </Popover>
                </Group>

                <UnstyledButton
                    onClick={() => {
                        setCoachOpened(true);
                        void ensureQualityCoach();
                    }}
                    onMouseEnter={() => {
                        void ensureQualityCoach();
                    }}
                >
                    <Box
                        p="sm"
                        style={{
                            borderRadius: 12,
                            cursor: 'pointer',
                            transition: 'transform 120ms ease, box-shadow 120ms ease',
                            ...summarySurface,
                        }}
                    >
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <div>
                                <Text size="sm" fw={700}>Stable Diffusion Learning Engine</Text>
                                <Text size="xs" c="dimmed" mt={2}>
                                    {resolvedQualityCoach?.summary ?? 'Open the coach for live diagnostics, recipe guidance, and safer parameter tuning.'}
                                </Text>
                            </div>
                            <Stack gap={6} align="flex-end">
                                <Badge color={severityColor} variant="light">
                                    {resolvedQualityCoach?.overallLabel ?? (coachLoading ? 'Loading' : 'Ready')}
                                </Badge>
                                {resolvedQualityCoach?.familyLabel ? (
                                    <Badge color="gray" variant="outline">
                                        {resolvedQualityCoach.familyLabel}
                                    </Badge>
                                ) : null}
                            </Stack>
                        </Group>
                        <Text size="xs" mt={8}>
                            {resolvedQualityCoach
                                ? resolvedQualityCoach.overallSeverity === 'balanced'
                                ? 'The current bake looks healthy. Open the panel to learn why it works.'
                                : 'Open the panel for live diagnostics, the baking matrix, recipe cards, and fixes.'
                                : 'Diagnostics stay on-demand until you open the coach, keeping the main Generate path lighter.'}
                        </Text>
                        {leadingHealthBadges.length > 0 ? (
                            <Group gap={6} mt={8}>
                                {leadingHealthBadges.map((item) => (
                                    <Badge
                                        key={item.key}
                                        color={getSeverityColor(item.severity)}
                                        variant={item.severity === 'balanced' ? 'outline' : 'light'}
                                    >
                                        {item.label}: {item.severity === 'balanced' ? 'OK' : item.severity === 'caution' ? 'Watch' : 'Fix'}
                                    </Badge>
                                ))}
                            </Group>
                        ) : null}
                        <Text size="xs" c="dimmed" mt={8}>
                            {resolvedQualityCoach
                                ? 'Updates live as you change model, size, steps, CFG, sampler, scheduler, CLIP skip, and img2img settings.'
                                : 'Hover or open the coach to load live analysis without front-loading the Generate page.'}
                        </Text>
                    </Box>
                </UnstyledButton>
            </Stack>

            <ContextMenu
                position={contextMenu.position}
                items={generateMenuItems}
                onClose={contextMenu.close}
            />
        </>
    );
});
