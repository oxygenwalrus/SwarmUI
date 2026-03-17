import { memo, useCallback, useEffect, useState } from 'react';
import {
    Card,
    Stack,
    Group,
    Text,
    Select,
    Paper,
    Progress,
    Image,
    Box,
} from '@mantine/core';
import { IconLayoutGrid, IconRefresh } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams, Model } from '../../../../api/types';
import type { MouseEvent } from 'react';
import { swarmClient } from '../../../../api/client';
import { SwarmActionIcon, SwarmButton } from '../../../../components/ui';

export interface ModelPanelProps {
    form: UseFormReturnType<GenerateParams>;
    models: Model[];
    loadingModels: boolean;
    loadingModel: boolean;
    modelLoadProgress: number;
    modelLoadingCount: number;
    modelLoadProgressEstimated: boolean;
    modelLoadError: string | null;
    onModelSelect: (modelName: string | null) => void;
    onRefresh: () => void;
    onOpenBrowser: () => void;
}

/**
 * Model selection panel for the bottom toolbar.
 * Shows model selector, loading progress, and model preview.
 */
export const ModelPanel = memo(function ModelPanel({
    form,
    models = [],
    loadingModels,
    loadingModel,
    modelLoadProgress,
    modelLoadingCount,
    modelLoadProgressEstimated,
    modelLoadError,
    onModelSelect,
    onRefresh,
    onOpenBrowser,
}: ModelPanelProps) {
    const selectedModel = models.find((m) => m.name === form.values.model);
    const [previewOptions, setPreviewOptions] = useState<string[]>([]);
    const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

    const normalizePreviewUrl = useCallback((raw?: string | null): string | null => {
        if (!raw) return null;
        if (raw.startsWith('data:')) return raw;
        if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
        if (raw.startsWith('viewspecial/')) return raw.replace('viewspecial/', '/View/');
        if (raw.startsWith('/')) return raw;
        return `/View/${raw}`;
    }, []);

    const getCivitaiSourceUrl = useCallback((input: string): string | null => {
        const match = input.match(/https?:\/\/(?:www\.)?civitai\.com\/models\/\d+(?:\?modelVersionId=\d+)?/i);
        return match ? match[0] : null;
    }, []);

    useEffect(() => {
        let cancelled = false;
        const loadPreviewOptions = async () => {
            if (!selectedModel?.name) {
                setPreviewOptions([]);
                setActivePreviewUrl(null);
                return;
            }

            const directPreview = normalizePreviewUrl(
                (selectedModel.preview_image || selectedModel.preview) as string | undefined
            );
            const collected = new Set<string>();
            if (directPreview) {
                collected.add(directPreview);
            }

            try {
                const response = await swarmClient.describeModel(selectedModel.name, 'Stable-Diffusion');
                if (!('model' in response) || !response.model) {
                    if (!cancelled) {
                        const list = Array.from(collected);
                        setPreviewOptions(list);
                        setActivePreviewUrl(list[0] || null);
                    }
                    return;
                }

                const model = response.model;
                const describedPreview = normalizePreviewUrl(model.preview_image);
                if (describedPreview) {
                    collected.add(describedPreview);
                }

                let civitaiImages: string[] = [];
                if (model.hash) {
                    const byHash = await swarmClient.forwardMetadataRequest(
                        `https://civitai.com/api/v1/model-versions/by-hash/${encodeURIComponent(model.hash)}`
                    );
                    civitaiImages = Array.isArray((byHash as { images?: Array<{ url?: string; type?: string }> })?.images)
                        ? ((byHash as { images?: Array<{ url?: string; type?: string }> }).images ?? [])
                            .filter((image) => image.type === 'image' && typeof image.url === 'string')
                            .map((image) => image.url as string)
                        : [];
                }

                if (civitaiImages.length === 0 && model.description) {
                    const sourceUrl = getCivitaiSourceUrl(model.description);
                    if (sourceUrl) {
                        const parsed = new URL(sourceUrl);
                        const pathParts = parsed.pathname.split('/').filter(Boolean);
                        const modelId = pathParts.length >= 2 && pathParts[0] === 'models' ? pathParts[1] : null;
                        const versionId = parsed.searchParams.get('modelVersionId');
                        if (modelId) {
                            const details = await swarmClient.forwardMetadataRequest(`https://civitai.com/api/v1/models/${modelId}`);
                            if (details && !details.error && Array.isArray((details as { modelVersions?: unknown[] }).modelVersions)) {
                                const versions = (details as {
                                    modelVersions: Array<{ id?: number; images?: Array<{ url?: string; type?: string }> }>;
                                }).modelVersions;
                                let selectedVersion = versions[0];
                                if (versionId) {
                                    const matched = versions.find((version) => String(version.id ?? '') === versionId);
                                    if (matched) {
                                        selectedVersion = matched;
                                    }
                                }
                                civitaiImages = Array.isArray(selectedVersion?.images)
                                    ? (selectedVersion.images ?? [])
                                        .filter((image) => image.type === 'image' && typeof image.url === 'string')
                                        .map((image) => image.url as string)
                                    : [];
                            }
                        }
                    }
                }

                civitaiImages.forEach((image) => {
                    const normalized = normalizePreviewUrl(image);
                    if (normalized) {
                        collected.add(normalized);
                    }
                });
            } catch {
                // Ignore metadata fetch failures; keep direct preview only.
            }

            if (!cancelled) {
                const list = Array.from(collected);
                setPreviewOptions(list);
                setActivePreviewUrl((prev) => (prev && list.includes(prev) ? prev : list[0] || null));
            }
        };

        void loadPreviewOptions();
        return () => {
            cancelled = true;
        };
    }, [selectedModel?.name, selectedModel?.preview, selectedModel?.preview_image, normalizePreviewUrl, getCivitaiSourceUrl]);

    return (
        <Card
            p="md"
            style={{
                flex: 1,
                height: '100%',
                overflow: 'auto',
            }}
        >
            <Stack gap="xs" h="100%">
                <Group justify="space-between">
                    <Text
                        size="xs"
                        fw={700}
                        c="invokeGray.0"
                        tt="uppercase"
                        style={{ letterSpacing: '0.5px' }}
                    >
                        Model
                    </Text>
                    <Group gap={4}>
                        <SwarmButton
                            size="xs"
                            tone="secondary"
                            emphasis="ghost"
                            onClick={onOpenBrowser}
                            leftSection={<IconLayoutGrid size={12} />}
                        >
                            Browse
                        </SwarmButton>
                        <SwarmActionIcon
                            size="xs"
                            tone="secondary"
                            emphasis="ghost"
                            label="Refresh model list"
                            onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation();
                                onRefresh();
                            }}
                        >
                            <IconRefresh size={14} />
                        </SwarmActionIcon>
                    </Group>
                </Group>

                <Group gap="xs" align="center" wrap="nowrap">
                    <Box
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 6,
                            overflow: 'hidden',
                            flexShrink: 0,
                            background: 'var(--theme-gray-6)',
                            border: '1px solid var(--theme-border-primary)',
                        }}
                    >
                        {(activePreviewUrl || previewOptions[0]) ? (
                            <Image
                                src={activePreviewUrl || previewOptions[0] || null}
                                alt={selectedModel?.title || selectedModel?.name || 'Model preview'}
                                h={30}
                                w={30}
                                fit="cover"
                            />
                        ) : null}
                    </Box>
                    <Select
                        placeholder={loadingModels ? 'Loading models...' : 'Select a model'}
                        data={models.map((model) => ({
                            value: model.name,
                            label: model.title || model.name,
                            disabled: !model.loaded,
                        }))}
                        searchable
                        size="xs"
                        maxDropdownHeight={180}
                        styles={{
                            root: { flex: 1, minWidth: 0, maxWidth: 460 },
                            input: {
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            },
                        }}
                        {...form.getInputProps('model')}
                        onChange={onModelSelect}
                        disabled={loadingModel}
                    />
                </Group>

                {/* Model Loading Progress/Error */}
                {(loadingModel || modelLoadError) && (
                    <Paper
                        p={6}
                        withBorder
                        style={{
                            borderColor: modelLoadError
                                ? 'var(--mantine-color-red-6)'
                                : 'var(--mantine-color-invokeBrand-6)',
                        }}
                    >
                        <Stack gap="xs">
                            <Group justify="space-between">
                                <Text
                                    size="xs"
                                    fw={700}
                                    c={modelLoadError ? 'red.6' : 'invokeBrand.6'}
                                >
                                    {modelLoadError ? 'Load Failed' : 'Loading Model...'}
                                </Text>
                                {!modelLoadError && (
                                    <Text size="xs" c="invokeGray.3">
                                        {modelLoadProgressEstimated
                                            ? (modelLoadingCount > 0
                                                ? `${modelLoadingCount} backend${modelLoadingCount === 1 ? '' : 's'} loading`
                                                : 'Syncing...')
                                            : `${Math.round(modelLoadProgress)}%`}
                                    </Text>
                                )}
                            </Group>
                            {modelLoadError ? (
                                <Text size="xs" c="red.6">
                                    {modelLoadError}
                                </Text>
                            ) : (
                                <Progress
                                    value={modelLoadProgressEstimated ? 100 : modelLoadProgress}
                                    size="sm"
                                    color="invokeBrand"
                                    className={modelLoadProgressEstimated ? 'swarm-progress-indeterminate' : undefined}
                                    animated
                                    styles={{
                                        root: {
                                            background: 'var(--theme-progress-track-bg)',
                                            border: '1px solid var(--theme-progress-track-border)',
                                        },
                                        section: {
                                            background: 'var(--theme-progress-fill)',
                                            boxShadow: '0 0 12px var(--theme-progress-glow)',
                                        },
                                    }}
                                />
                            )}
                        </Stack>
                    </Paper>
                )}

                {/* Model Info */}
                {form.values.model && !loadingModel && selectedModel && (
                    <Stack gap={6} style={{ flex: 1, minHeight: 0 }}>
                        <Text size="xs" c="invokeGray.3" lineClamp={1}>
                            {(selectedModel.title || selectedModel.name)} • {selectedModel.architecture || 'Unknown architecture'}
                        </Text>
                        {(activePreviewUrl || previewOptions[0]) && (
                            <Box
                                style={{
                                    flex: 1,
                                    minHeight: 180,
                                    borderRadius: 8,
                                    overflow: 'hidden',
                                    border: '1px solid var(--theme-border-primary)',
                                    background: 'var(--theme-gray-6)',
                                }}
                            >
                                <Image
                                    src={activePreviewUrl || previewOptions[0] || null}
                                    alt="Model Preview"
                                    radius={0}
                                    h="100%"
                                    fit="contain"
                                />
                            </Box>
                        )}
                        {previewOptions.length > 1 && (
                            <Box
                                style={{
                                    width: '100%',
                                    maxHeight: 138,
                                    overflowX: 'auto',
                                    overflowY: 'scroll',
                                    paddingRight: 4,
                                    scrollbarWidth: 'thin',
                                }}
                            >
                                <Group gap="xs" wrap="wrap" align="flex-start">
                                    {previewOptions.map((preview, index) => (
                                        <Box
                                            key={`${preview}-${index}`}
                                            component="button"
                                            type="button"
                                            onClick={() => setActivePreviewUrl(preview)}
                                            style={{
                                                width: 56,
                                                height: 56,
                                                borderRadius: 6,
                                                overflow: 'hidden',
                                                border:
                                                    preview === (activePreviewUrl || previewOptions[0])
                                                        ? '2px solid var(--mantine-color-blue-5)'
                                                        : '1px solid var(--theme-border-primary)',
                                                background: 'var(--theme-gray-6)',
                                                flexShrink: 0,
                                                cursor: 'pointer',
                                                padding: 0,
                                            }}
                                        >
                                            <Image
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                h={56}
                                                w={56}
                                                fit="cover"
                                            />
                                        </Box>
                                    ))}
                                </Group>
                            </Box>
                        )}
                    </Stack>
                )}
            </Stack>
        </Card>
    );
});
