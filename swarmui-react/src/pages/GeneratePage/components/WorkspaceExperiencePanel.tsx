import {
    Badge,
    Box,
    Button,
    Card,
    Divider,
    Group,
    SegmentedControl,
    Select,
    Stack,
    Text,
} from '@mantine/core';
import { IconRestore, IconSparkles } from '@tabler/icons-react';
import type { GenerateWorkspaceMode } from '../../../stores/navigationStore';
import type { GenerationIssue, GenerationRecipe, WorkspaceSnapshot } from '../../../features/generation/productTypes';
import { SwarmButton } from '../../../components/ui';

interface WorkspaceExperiencePanelProps {
    mode: GenerateWorkspaceMode;
    onModeChange: (mode: GenerateWorkspaceMode) => void;
    recipes: GenerationRecipe[];
    activeRecipeId: string | null;
    onApplyRecipe: (recipeId: string | null) => void;
    onSaveRecipe: () => void;
    onPromoteWorkflow: () => void;
    lastSnapshot: WorkspaceSnapshot | null;
    onRestoreSnapshot: () => void;
    issues: GenerationIssue[];
    selectedModel: string;
    backendCount: number;
    diffCount: number;
}

export function WorkspaceExperiencePanel({
    mode,
    onModeChange,
    recipes,
    activeRecipeId,
    onApplyRecipe,
    onSaveRecipe,
    onPromoteWorkflow,
    lastSnapshot,
    onRestoreSnapshot,
    issues,
    selectedModel,
    backendCount,
    diffCount,
}: WorkspaceExperiencePanelProps) {
    const blockingIssues = issues.filter((issue) => issue.severity === 'blocking');
    const warningIssues = issues.filter((issue) => issue.severity === 'warning');
    const showGuide = !selectedModel;
    const helperBadges = [
        ...(showGuide ? [
            { key: 'guide-model', color: 'teal', label: 'Select model' },
            { key: 'guide-mode', color: 'blue', label: 'Choose mode' },
            { key: 'guide-generate', color: 'grape', label: 'Generate or queue' },
        ] : []),
        ...blockingIssues.map((issue) => ({ key: issue.id, color: 'red', label: issue.message })),
        ...warningIssues.map((issue) => ({ key: issue.id, color: 'yellow', label: issue.message })),
    ];

    return (
        <Stack gap="sm" pb="sm">
            <Card withBorder radius="lg" shadow="sm" className="generate-workspace-bar">
                <Stack gap="xs">
                    <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm" className="generate-workspace-bar__top">
                        <Stack gap={4}>
                            <Group gap="xs">
                                <IconSparkles size={16} />
                                <Text fw={700}>Workspace Mode</Text>
                                <Badge variant="light" color="blue">{backendCount} backends tracked</Badge>
                                {diffCount > 0 ? <Badge color="grape" variant="light">{diffCount} recipe diffs</Badge> : null}
                            </Group>
                            <Text size="xs" c="dimmed">
                                Choose the right level of structure for this run, then layer recipes and restore points on top.
                            </Text>
                        </Stack>
                        <SwarmButton tone="secondary" emphasis="soft" size="xs" onClick={onSaveRecipe}>
                            Save Recipe
                        </SwarmButton>
                    </Group>

                    <Group align="end" gap="sm" wrap="wrap" className="generate-workspace-bar__controls">
                        <Box className="generate-workspace-bar__mode">
                            <SegmentedControl
                                value={mode}
                                onChange={(value) => onModeChange(value as GenerateWorkspaceMode)}
                                size="xs"
                                data={[
                                    { value: 'quick', label: 'Quick' },
                                    { value: 'guided', label: 'Guided' },
                                    { value: 'advanced', label: 'Advanced' },
                                    { value: 'video', label: 'Video' },
                                ]}
                            />
                        </Box>

                        <Box className="generate-workspace-bar__recipe">
                            <Select
                                label="Recipe"
                                placeholder="Apply a saved recipe"
                                data={recipes.map((recipe) => ({
                                    value: recipe.id,
                                    label: recipe.name,
                                }))}
                                value={activeRecipeId}
                                onChange={onApplyRecipe}
                                clearable
                            />
                        </Box>

                        <Group gap="sm" wrap="wrap" className="generate-workspace-bar__actions">
                            <Button
                                variant="light"
                                leftSection={<IconRestore size={14} />}
                                onClick={onRestoreSnapshot}
                                disabled={!lastSnapshot}
                            >
                                Restore Session
                            </Button>
                            <Button variant="light" onClick={onPromoteWorkflow}>
                                Send To Workflow
                            </Button>
                        </Group>
                    </Group>

                    {helperBadges.length > 0 ? (
                        <>
                            <Divider opacity={0.4} />
                            <Group gap="xs" wrap="wrap">
                                {helperBadges.map((badge) => (
                                    <Badge key={badge.key} color={badge.color} variant="light">
                                        {badge.label}
                                    </Badge>
                                ))}
                            </Group>
                        </>
                    ) : null}
                </Stack>
            </Card>
        </Stack>
    );
}
