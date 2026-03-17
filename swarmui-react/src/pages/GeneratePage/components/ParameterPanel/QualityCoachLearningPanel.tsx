import { useMemo, useState } from 'react';
import {
    Accordion,
    Badge,
    Box,
    Button,
    Checkbox,
    Divider,
    Group,
    List,
    Paper,
    SegmentedControl,
    SimpleGrid,
    Stack,
    Tabs,
    Text,
} from '@mantine/core';
import type { GenerateParams } from '../../../../api/types';
import type { QualityCoachAnalysis, QualityCoachSeverity } from '../../utils/qualityCoach';
import {
    getCurrentMatrixCell,
    getFailureModesForDifficulty,
    getGuidesForDifficulty,
    getLearningLevelLabel,
    getMatchedFailureModes,
    getMatrixBandForCfg,
    getMatrixBandForSteps,
    getRecipesForDifficulty,
    QUALITY_COACH_DIAGNOSTIC_SYMPTOMS,
    QUALITY_COACH_GLOSSARY,
    QUALITY_COACH_MATRIX,
    type LearningDifficulty,
} from '../../utils/qualityCoachLearningData';

export interface QualityCoachLearningPanelProps {
    qualityCoach: QualityCoachAnalysis;
    currentValues?: Partial<GenerateParams>;
    onApplyValues?: (overrides: Partial<GenerateParams>) => void;
    onClose?: () => void;
}

function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function getSeverityColor(severity: QualityCoachSeverity): string {
    if (severity === 'high-risk') return 'red';
    if (severity === 'caution') return 'yellow';
    return 'green';
}

function getSeverityLabel(severity: QualityCoachSeverity): string {
    if (severity === 'high-risk') return 'High Risk';
    if (severity === 'caution') return 'Caution';
    return 'Balanced';
}

export function QualityCoachLearningPanel({
    qualityCoach,
    currentValues,
    onApplyValues,
    onClose,
}: QualityCoachLearningPanelProps) {
    const [difficulty, setDifficulty] = useState<LearningDifficulty>('beginner');
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

    const currentCfg = toNumber(currentValues?.cfgscale);
    const currentSteps = toNumber(currentValues?.steps);
    const matrixCell = useMemo(
        () => getCurrentMatrixCell(currentCfg, currentSteps),
        [currentCfg, currentSteps]
    );
    const guides = useMemo(() => getGuidesForDifficulty(difficulty), [difficulty]);
    const recipes = useMemo(() => getRecipesForDifficulty(difficulty), [difficulty]);
    const failureModes = useMemo(() => getFailureModesForDifficulty(difficulty), [difficulty]);
    const matchedFailures = useMemo(() => getMatchedFailureModes(selectedSymptoms), [selectedSymptoms]);

    return (
        <Stack gap="md">
            <Paper p="sm" radius="md" style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}>
                <Stack gap="xs">
                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                        <div>
                            <Text fw={700} size="sm">Stable Diffusion Learning Engine</Text>
                            <Text size="xs" c="dimmed">
                                Think of image generation like baking: CFG is how strictly you follow the recipe, steps are oven time, the sampler is the oven, resolution is the tin, and denoise controls how much of the original cake you rebuild.
                            </Text>
                        </div>
                        <Badge color={getSeverityColor(qualityCoach.overallSeverity)} variant="light">
                            {qualityCoach.overallLabel}
                        </Badge>
                    </Group>
                    <SegmentedControl
                        size="xs"
                        fullWidth
                        value={difficulty}
                        onChange={(value) => setDifficulty(value as LearningDifficulty)}
                        data={[
                            { label: 'Beginner', value: 'beginner' },
                            { label: 'Intermediate', value: 'intermediate' },
                            { label: 'Advanced', value: 'advanced' },
                        ]}
                    />
                    <Text size="xs" c="dimmed">
                        Mode: {getLearningLevelLabel(difficulty)}. The engine expands from the core bake relationship first, then adds sampler, resolution, scheduler, CLIP, VAE, and diagnostics.
                    </Text>
                </Stack>
            </Paper>

            <Tabs defaultValue="playground" keepMounted={false}>
                <Tabs.List grow>
                    <Tabs.Tab value="playground">Playground</Tabs.Tab>
                    <Tabs.Tab value="matrix">Matrix</Tabs.Tab>
                    <Tabs.Tab value="diagnose">Diagnose</Tabs.Tab>
                    <Tabs.Tab value="recipes">Recipes</Tabs.Tab>
                    <Tabs.Tab value="gallery">Gallery</Tabs.Tab>
                    <Tabs.Tab value="learn">Learn</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="playground" pt="sm">
                    <Stack gap="sm">
                        <Paper p="sm" radius="md" style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}>
                            <Group justify="space-between" align="flex-start" wrap="nowrap">
                                <div>
                                    <Text fw={700} size="sm">Current Bake State</Text>
                                    <Text size="xs" c="dimmed">
                                        {matrixCell.description}
                                    </Text>
                                </div>
                                <Badge color={getSeverityColor(matrixCell.severity)} variant="light">
                                    {matrixCell.title}
                                </Badge>
                            </Group>
                            <Text size="xs" mt={8}>
                                Baking analogy: {matrixCell.analogy}
                            </Text>
                            <Text size="xs" c="dimmed" mt={6}>
                                Current core settings: CFG {currentCfg ?? 'unset'} and Steps {currentSteps ?? 'unset'}.
                            </Text>
                        </Paper>

                        <SimpleGrid cols={2} spacing="sm" verticalSpacing="sm">
                            {qualityCoach.parameterHealth.map((item) => (
                                <Paper
                                    key={item.key}
                                    p="sm"
                                    radius="md"
                                    style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}
                                >
                                    <Group justify="space-between" align="flex-start" wrap="nowrap">
                                        <div>
                                            <Text fw={600} size="sm">{item.label}</Text>
                                            <Text size="xs" c="dimmed">Current: {item.currentValue}</Text>
                                        </div>
                                        <Badge color={getSeverityColor(item.severity)} variant="light">
                                            {getSeverityLabel(item.severity)}
                                        </Badge>
                                    </Group>
                                    <Text size="xs" mt={6}>{item.note}</Text>
                                    <Text size="xs" c="dimmed" mt={4}>
                                        Recommended: {item.recommendedRange}
                                    </Text>
                                </Paper>
                            ))}
                        </SimpleGrid>

                        {qualityCoach.issues.length > 0 ? (
                            <Stack gap="sm">
                                <Text size="xs" fw={700} tt="uppercase" c="dimmed">What Is Going Wrong</Text>
                                {qualityCoach.issues.slice(0, 6).map((issue) => (
                                    <Paper
                                        key={issue.id}
                                        p="sm"
                                        radius="md"
                                        style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}
                                    >
                                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                                            <div>
                                                <Text fw={600} size="sm">{issue.title}</Text>
                                                <Text size="xs" c="dimmed">
                                                    {issue.currentValue ?? 'Current value unavailable'} | {issue.recommendedRange ?? 'See recommendation'}
                                                </Text>
                                            </div>
                                            <Badge color={getSeverityColor(issue.severity)} variant="light">
                                                {getSeverityLabel(issue.severity)}
                                            </Badge>
                                        </Group>
                                        <Text size="xs" mt={6}>{issue.description}</Text>
                                        {issue.evidence ? (
                                            <Text size="xs" c="dimmed" mt={4}>Why: {issue.evidence}</Text>
                                        ) : null}
                                        {issue.recommendation ? (
                                            <Text size="xs" mt={4}>Fix: {issue.recommendation}</Text>
                                        ) : null}
                                    </Paper>
                                ))}
                                {onApplyValues && Object.keys(qualityCoach.mergedOverrides).length > 0 ? (
                                    <Button
                                        size="sm"
                                        variant="light"
                                        onClick={() => {
                                            onApplyValues(qualityCoach.mergedOverrides);
                                            onClose?.();
                                        }}
                                    >
                                        Apply Suggested Fixes
                                    </Button>
                                ) : null}
                            </Stack>
                        ) : (
                            <Paper p="sm" radius="md" style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}>
                                <Text size="sm" fw={600}>The current bake looks balanced.</Text>
                                <Text size="xs" c="dimmed" mt={4}>
                                    The learning engine still stays useful here: open the matrix and recipes to understand why the current combination is safe.
                                </Text>
                            </Paper>
                        )}
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="matrix" pt="sm">
                    <Stack gap="sm">
                        <Text size="sm" fw={700}>Parameter Interaction Matrix</Text>
                        <Text size="xs" c="dimmed">
                            This is the centrepiece relationship for SDXL / Illustrious workflows: CFG controls recipe strictness, and steps control bake time. The highlighted cell shows where your current settings land.
                        </Text>
                        <SimpleGrid cols={3} spacing="sm">
                            {QUALITY_COACH_MATRIX.map((cell) => {
                                const isCurrent =
                                    cell.cfgBand === getMatrixBandForCfg(currentCfg) &&
                                    cell.stepsBand === getMatrixBandForSteps(currentSteps);
                                return (
                                    <Paper
                                        key={`${cell.stepsBand}-${cell.cfgBand}`}
                                        p="sm"
                                        radius="md"
                                        style={{
                                            border: isCurrent
                                                ? `2px solid var(--mantine-color-${getSeverityColor(cell.severity)}-6)`
                                                : '1px solid var(--mantine-color-invokeGray-7)',
                                            boxShadow: isCurrent ? '0 0 0 1px rgba(255,255,255,0.05)' : undefined,
                                        }}
                                    >
                                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                                            <Text fw={600} size="sm">{cell.title}</Text>
                                            <Badge color={getSeverityColor(cell.severity)} variant="light">
                                                {getSeverityLabel(cell.severity)}
                                            </Badge>
                                        </Group>
                                        <Text size="xs" c="dimmed" mt={4}>
                                            {cell.stepsBand.toUpperCase()} steps x {cell.cfgBand.toUpperCase()} CFG
                                        </Text>
                                        <Text size="xs" mt={6}>{cell.description}</Text>
                                        <Text size="xs" c="dimmed" mt={4}>Analogy: {cell.analogy}</Text>
                                    </Paper>
                                );
                            })}
                        </SimpleGrid>
                        <Paper p="sm" radius="md" style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}>
                            <Text size="sm" fw={600}>Current highlighted cell: {matrixCell.title}</Text>
                            <Text size="xs" mt={4}>{matrixCell.description}</Text>
                            <Text size="xs" c="dimmed" mt={4}>
                                This is why the engine treats high CFG plus high steps as the fastest path to deep-fried output, while low steps plus low CFG reads as raw batter.
                            </Text>
                        </Paper>
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="diagnose" pt="sm">
                    <Stack gap="sm">
                        <Text size="sm" fw={700}>What Went Wrong?</Text>
                        <Text size="xs" c="dimmed">
                            Tick the symptoms that match what you are seeing. The engine will map them to the most likely failure modes and fixes.
                        </Text>
                        <Checkbox.Group value={selectedSymptoms} onChange={setSelectedSymptoms}>
                            <SimpleGrid cols={2} spacing="xs">
                                {QUALITY_COACH_DIAGNOSTIC_SYMPTOMS.map((symptom) => (
                                    <Checkbox key={symptom.id} value={symptom.id} label={symptom.label} />
                                ))}
                            </SimpleGrid>
                        </Checkbox.Group>
                        {matchedFailures.length > 0 ? (
                            <Stack gap="sm">
                                {matchedFailures.slice(0, 4).map((failure) => (
                                    <Paper key={failure.id} p="sm" radius="md" style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}>
                                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                                            <div>
                                                <Text fw={600} size="sm">{failure.name}</Text>
                                                <Text size="xs" c="dimmed">{failure.whatItMeans}</Text>
                                            </div>
                                            <Badge color={getSeverityColor(failure.severity)} variant="light">
                                                Match {failure.matchCount}
                                            </Badge>
                                        </Group>
                                        <Text size="xs" mt={6}>Likely causes: {failure.likelyCauses.join(', ')}</Text>
                                        <Text size="xs" c="dimmed" mt={4}>Suggested fix: {failure.fix}</Text>
                                    </Paper>
                                ))}
                            </Stack>
                        ) : (
                            <Text size="xs" c="dimmed">
                                No symptoms selected yet. Try choosing terms like overbaked, mushy, washed out, or double head.
                            </Text>
                        )}
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="recipes" pt="sm">
                    <Stack gap="sm">
                        <Text size="sm" fw={700}>Recipe Cards</Text>
                        <Text size="xs" c="dimmed">
                            Quick starts for common goals. These are safe launch points for SDXL / Illustrious-family work rather than absolute rules.
                        </Text>
                        {recipes.map((recipe) => (
                            <Paper key={recipe.id} p="sm" radius="md" style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}>
                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                    <div>
                                        <Text fw={600} size="sm">{recipe.name}</Text>
                                        <Text size="xs" c="dimmed">{recipe.goal}</Text>
                                    </div>
                                    <Badge color="blue" variant="light">
                                        {getLearningLevelLabel(recipe.difficulty)}
                                    </Badge>
                                </Group>
                                <Text size="xs" mt={6}>{recipe.notes}</Text>
                                <Text size="xs" c="dimmed" mt={4}>
                                    CFG {recipe.params.cfgscale ?? '-'} | Steps {recipe.params.steps ?? '-'} | Sampler {recipe.params.sampler ?? '-'} | Size {recipe.params.width ?? '-'}x{recipe.params.height ?? '-'}
                                </Text>
                                {onApplyValues ? (
                                    <Button
                                        size="xs"
                                        variant="light"
                                        mt="sm"
                                        onClick={() => {
                                            onApplyValues(recipe.params);
                                            onClose?.();
                                        }}
                                    >
                                        Apply Recipe
                                    </Button>
                                ) : null}
                            </Paper>
                        ))}
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="gallery" pt="sm">
                    <Stack gap="sm">
                        <Text size="sm" fw={700}>Failure Mode Gallery</Text>
                        <Text size="xs" c="dimmed">
                            These are the community-style labels people use to describe broken generations. The goal is to help users name problems quickly, then connect them back to likely parameter causes.
                        </Text>
                        {failureModes.map((mode) => (
                            <Paper key={mode.id} p="sm" radius="md" style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}>
                                <Group justify="space-between" align="flex-start" wrap="nowrap">
                                    <div>
                                        <Text fw={600} size="sm">{mode.term}</Text>
                                        <Text size="xs" c="dimmed">{mode.whatItMeans}</Text>
                                    </div>
                                    <Badge color={getSeverityColor(mode.severity)} variant="light">
                                        {getSeverityLabel(mode.severity)}
                                    </Badge>
                                </Group>
                                <Text size="xs" mt={6}>Typical causes: {mode.likelyCauses.join(', ')}</Text>
                                <Text size="xs" c="dimmed" mt={4}>Fix: {mode.fix}</Text>
                            </Paper>
                        ))}
                    </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="learn" pt="sm">
                    <Stack gap="sm">
                        <Text size="sm" fw={700}>Parameter Deep Dives</Text>
                        <Text size="xs" c="dimmed">
                            Each parameter is explained in plain English, grounded in the baking analogy, and filtered by the current learning level.
                        </Text>
                        <Accordion multiple defaultValue={guides.slice(0, 2).map((guide) => guide.key)}>
                            {guides.map((guide) => (
                                <Accordion.Item key={guide.key} value={guide.key}>
                                    <Accordion.Control>
                                        <Group justify="space-between" wrap="nowrap">
                                            <div>
                                                <Text fw={600} size="sm">{guide.title}</Text>
                                                <Text size="xs" c="dimmed">{guide.expandedName}</Text>
                                            </div>
                                            <Badge color="gray" variant="outline">
                                                {getLearningLevelLabel(guide.difficulty)}
                                            </Badge>
                                        </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                        <Stack gap="sm">
                                            <Text size="xs">{guide.description}</Text>
                                            <Text size="xs" c="dimmed">Baking analogy: {guide.analogy}</Text>
                                            <Text size="xs">{guide.typicalRange}</Text>
                                            <Text size="xs">{guide.sweetSpot}</Text>
                                            <Text size="xs">{guide.defaultStartingPoint}</Text>
                                            {guide.aliases?.length ? (
                                                <Text size="xs" c="dimmed">Aliases: {guide.aliases.join(', ')}</Text>
                                            ) : null}
                                            <Divider />
                                            <Stack gap="xs">
                                                {guide.effects.map((effect) => (
                                                    <Paper key={effect.range} p="xs" radius="sm" style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}>
                                                        <Text fw={600} size="xs">{effect.range}</Text>
                                                        <Text size="xs" mt={4}>{effect.visualResult}</Text>
                                                        <Text size="xs" c="dimmed" mt={4}>Analogy: {effect.analogy}</Text>
                                                    </Paper>
                                                ))}
                                            </Stack>
                                            <List size="xs" spacing="xs">
                                                {guide.teachingPoints.map((point) => (
                                                    <List.Item key={point}>{point}</List.Item>
                                                ))}
                                            </List>
                                        </Stack>
                                    </Accordion.Panel>
                                </Accordion.Item>
                            ))}
                        </Accordion>

                        <Paper p="sm" radius="md" style={{ border: '1px solid var(--mantine-color-invokeGray-7)' }}>
                            <Text size="sm" fw={600}>Glossary</Text>
                            <Stack gap="xs" mt="sm">
                                {QUALITY_COACH_GLOSSARY.map((item) => (
                                    <Box key={item.term}>
                                        <Text size="xs" fw={600}>{item.term}</Text>
                                        <Text size="xs" c="dimmed">
                                            {item.meaning} Typical cause: {item.typicalCause}
                                        </Text>
                                    </Box>
                                ))}
                            </Stack>
                        </Paper>
                    </Stack>
                </Tabs.Panel>
            </Tabs>
        </Stack>
    );
}
