import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Stack,
    Group,
    Text,
    TextInput,
    Textarea,
    NumberInput,
    Loader,
    Center,
    Box,
    Modal,
    Collapse,
    Badge,
    FileButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronDown, IconChevronUp, IconPhoto, IconTrash } from '@tabler/icons-react';
import { swarmClient } from '../api/client';
import type { ModelDescription } from '../api/types';
import { LazyImage } from './LazyImage';
import { SwarmButton, SwarmBadge } from './ui';

interface ModelDetailModalProps {
    opened: boolean;
    onClose: () => void;
    modelName: string;
    subtype?: string;
    onModelChanged?: () => void;
    onAddTriggerToPrompt?: (trigger: string) => void;
    extraTriggerKeywords?: string[];
}

export function ModelDetailModal({
    opened,
    onClose,
    modelName,
    subtype = 'Stable-Diffusion',
    onModelChanged,
    onAddTriggerToPrompt,
    extraTriggerKeywords = [],
}: ModelDetailModalProps) {
    const [model, setModel] = useState<ModelDescription | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);

    // Editable fields
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [description, setDescription] = useState('');
    const [triggerPhrase, setTriggerPhrase] = useState('');
    const [tags, setTags] = useState('');
    const [standardWidth, setStandardWidth] = useState<number>(512);
    const [standardHeight, setStandardHeight] = useState<number>(512);
    const [usageHint, setUsageHint] = useState('');
    const [license, setLicense] = useState('');
    const [previewImageData, setPreviewImageData] = useState<string | null>(null);
    const [previewFileName, setPreviewFileName] = useState<string | null>(null);
    const [savingPreview, setSavingPreview] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);
    const [civitaiImages, setCivitaiImages] = useState<string[]>([]);
    const [selectedCivitaiImageIndex, setSelectedCivitaiImageIndex] = useState<number>(-1);
    const [loadingCivitaiImages, setLoadingCivitaiImages] = useState(false);
    const [convertingCivitaiImage, setConvertingCivitaiImage] = useState(false);
    const [civitaiImageError, setCivitaiImageError] = useState<string | null>(null);
    const [selectedCivitaiImageUrl, setSelectedCivitaiImageUrl] = useState<string | null>(null);

    const sanitizeDescription = (input: string): string => {
        if (!input) return '';
        const withoutTags = input
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<\/?[^>]+(>|$)/g, ' ');
        return withoutTags
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/\s+/g, ' ')
            .trim();
    };

    const extractTriggerKeywords = (input: string): string[] => {
        if (!input) return [];
        return input
            .split(/[,\n;]+/)
            .map((word) => word.trim())
            .filter((word) => word.length > 1);
    };

    const getCivitaiSourceUrl = (input: string): string | null => {
        const match = input.match(/https?:\/\/(?:www\.)?civitai\.com\/models\/\d+(?:\?modelVersionId=\d+)?/i);
        return match ? match[0] : null;
    };

    const convertImageUrlToDataUrl = useCallback(async (imageUrl: string): Promise<string | null> => {
        // Prefer backend proxy first (works in desktop/CSP environments and avoids CORS quirks).
        try {
            const proxied = await swarmClient.forwardMetadataImageRequest(imageUrl);
            if (proxied && proxied.startsWith('data:image/')) {
                return proxied;
            }
        } catch {
            // Ignore proxy failures and continue with browser conversion fallbacks.
        }

        const convertWithCanvas = async (): Promise<string | null> =>
            await new Promise<string | null>((resolve) => {
                const image = new window.Image();
                image.crossOrigin = 'anonymous';
                image.onload = () => {
                    try {
                        const width = image.naturalWidth || image.width;
                        const height = image.naturalHeight || image.height;
                        if (!width || !height) {
                            resolve(null);
                            return;
                        }
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (!context) {
                            resolve(null);
                            return;
                        }
                        const targetMp = 256 * 256;
                        const mp = Math.max(1, width * height);
                        const ratio = Math.sqrt(targetMp / mp);
                        const widthFixed = Math.max(1, Math.round(width * ratio));
                        const heightFixed = Math.max(1, Math.round(height * ratio));
                        canvas.width = widthFixed;
                        canvas.height = heightFixed;
                        context.drawImage(image, 0, 0, widthFixed, heightFixed);
                        const converted = canvas.toDataURL('image/jpeg');
                        resolve(converted.startsWith('data:image/') ? converted : null);
                    } catch {
                        resolve(null);
                    }
                };
                image.onerror = () => resolve(null);
                image.src = imageUrl;
            });

        const canvasResult = await convertWithCanvas();
        if (canvasResult) {
            return canvasResult;
        }

        try {
            const response = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
            if (!response.ok) {
                const proxied = await swarmClient.forwardMetadataImageRequest(imageUrl);
                return proxied;
            }
            const blob = await response.blob();
            const browserData = await new Promise<string | null>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = typeof reader.result === 'string' ? reader.result : '';
                    resolve(result.startsWith('data:image/') ? result : null);
                };
                reader.onerror = () => reject(new Error('Failed to read image data'));
                reader.readAsDataURL(blob);
            });
            if (browserData) {
                return browserData;
            }
            return await swarmClient.forwardMetadataImageRequest(imageUrl);
        } catch {
            return await swarmClient.forwardMetadataImageRequest(imageUrl);
        }
    }, []);

    const loadCivitaiImages = useCallback(async (descriptionText: string, hash?: string) => {
        setLoadingCivitaiImages(true);
        setCivitaiImageError(null);
        try {
            const normalizedHash = hash?.trim();
            if (normalizedHash) {
                const byHash = await swarmClient.forwardMetadataRequest(
                    `https://civitai.com/api/v1/model-versions/by-hash/${encodeURIComponent(normalizedHash)}`
                );
                const hashImages = Array.isArray((byHash as { images?: Array<{ url?: string; type?: string }> })?.images)
                    ? ((byHash as { images?: Array<{ url?: string; type?: string }> }).images ?? [])
                        .filter((image) => image.type === 'image' && typeof image.url === 'string')
                        .map((image) => image.url as string)
                    : [];
                if (hashImages.length > 0) {
                    setCivitaiImages(hashImages);
                    setSelectedCivitaiImageIndex(0);
                    return;
                }
            }

            const civitaiSource = getCivitaiSourceUrl(descriptionText);
            if (!civitaiSource) {
                setCivitaiImages([]);
                return;
            }
            const parsed = new URL(civitaiSource);
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (parts.length < 2 || parts[0] !== 'models') {
                setCivitaiImages([]);
                return;
            }
            const modelId = parts[1];
            const modelVersionId = parsed.searchParams.get('modelVersionId');
            const details = await swarmClient.forwardMetadataRequest(`https://civitai.com/api/v1/models/${modelId}`);
            if (!details || details.error || !Array.isArray((details as { modelVersions?: unknown[] }).modelVersions)) {
                setCivitaiImages([]);
                return;
            }
            const modelVersions = (details as {
                modelVersions: Array<{
                    id?: number;
                    images?: Array<{ url?: string; type?: string }>;
                }>;
            }).modelVersions;
            let selectedVersion = modelVersions[0];
            if (modelVersionId) {
                const byId = modelVersions.find((version) => String(version.id ?? '') === modelVersionId);
                if (byId) {
                    selectedVersion = byId;
                }
            }
            const versionImages = Array.isArray(selectedVersion?.images)
                ? (selectedVersion.images ?? [])
                    .filter((image) => image.type === 'image' && typeof image.url === 'string')
                    .map((image) => image.url as string)
                : [];
            setCivitaiImages(versionImages);
            setSelectedCivitaiImageIndex(versionImages.length > 0 ? 0 : -1);
        } catch {
            setCivitaiImageError('Unable to load CivitAI preview options');
            setCivitaiImages([]);
            setSelectedCivitaiImageIndex(-1);
        } finally {
            setLoadingCivitaiImages(false);
        }
    }, []);

    const loadModel = useCallback(async () => {
        if (!modelName) return;
        setLoading(true);
        try {
            const response = await swarmClient.describeModel(modelName, subtype);
            if ('model' in response) {
                const m = response.model;
                const cleanedDescription = sanitizeDescription(m.description || '');
                setModel(m);
                setTitle(m.title || '');
                setAuthor(m.author || '');
                setDescription(cleanedDescription);
                setTriggerPhrase(m.trigger_phrase || '');
                setTags(Array.isArray(m.tags) ? m.tags.join(', ') : '');
                setStandardWidth(m.standard_width || 512);
                setStandardHeight(m.standard_height || 512);
                setUsageHint(m.usage_hint || '');
                setLicense(m.license || '');
                setPreviewImageData(m.preview_image || null);
                setPreviewFileName(null);
                setSelectedCivitaiImageUrl(null);
                setShowFullDescription(false);
                setShowAdvanced(false);
                setShowAdvancedEdit(false);
                void loadCivitaiImages(cleanedDescription, m.hash);
            } else {
                notifications.show({ title: 'Error', message: response.error, color: 'red' });
                onClose();
            }
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to load model details', color: 'red' });
        } finally {
            setLoading(false);
        }
    }, [modelName, subtype, onClose, loadCivitaiImages]);

    useEffect(() => {
        if (opened && modelName) {
            setEditing(false);
            loadModel();
        }
    }, [opened, modelName, loadModel]);

    const handleSave = async () => {
        if (!model) return;
        setSaving(true);
        try {
            const response = await swarmClient.editModelMetadata({
                model: modelName,
                title,
                author,
                description,
                trigger_phrase: triggerPhrase,
                tags,
                standard_width: standardWidth,
                standard_height: standardHeight,
                usage_hint: usageHint,
                license,
                preview_image:
                    previewImageData && previewImageData.startsWith('data:image/')
                        ? previewImageData
                        : null,
                subtype,
            });
            if (response.error) {
                notifications.show({ title: 'Save Failed', message: response.error, color: 'red' });
            } else {
                notifications.show({ title: 'Saved', message: 'Model metadata updated', color: 'green' });
                setEditing(false);
                onModelChanged?.();
                await loadModel();
            }
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to save metadata', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    const previewUrl = (() => {
        const rawPreview = (previewImageData || '').trim();
        if (!rawPreview) {
            return null;
        }
        if (
            rawPreview === 'imgs/model_placeholder.jpg' ||
            rawPreview === '/imgs/model_placeholder.jpg'
        ) {
            return null;
        }
        if (
            rawPreview.startsWith('data:') ||
            rawPreview.startsWith('http://') ||
            rawPreview.startsWith('https://')
        ) {
            return rawPreview;
        }
        if (rawPreview.startsWith('viewspecial/')) {
            return rawPreview.replace('viewspecial/', '/View/');
        }
        if (rawPreview.startsWith('/')) {
            return rawPreview;
        }
        return `/View/${rawPreview}`;
    })();

    const triggerKeywords = useMemo(() => {
        const fromPhrase = extractTriggerKeywords(triggerPhrase || model?.trigger_phrase || '');
        const fromExtra = extraTriggerKeywords
            .map((keyword) => keyword.trim())
            .filter((keyword) => keyword.length > 1);
        return Array.from(new Set([...fromPhrase, ...fromExtra]));
    }, [triggerPhrase, model?.trigger_phrase, extraTriggerKeywords]);

    const handlePreviewFileSelect = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : null;
            if (!result) {
                notifications.show({ title: 'Error', message: 'Failed to read image file', color: 'red' });
                return;
            }
            setPreviewImageData(result);
            setPreviewFileName(file.name);
            setSelectedCivitaiImageUrl(null);
            notifications.show({ title: 'Preview Updated', message: `Loaded "${file.name}"`, color: 'green' });
        };
        reader.onerror = () => {
            notifications.show({ title: 'Error', message: 'Failed to load preview image', color: 'red' });
        };
        reader.readAsDataURL(file);
    };

    const handleSavePreview = async () => {
        if (!model) return;
        setSavingPreview(true);
        try {
            let backendError: string | null = null;
            // If we have a CivitAI URL but previewImageData is NOT yet a data URI,
            // try the direct backend URL-to-model save (avoids double conversion).
            if (
                selectedCivitaiImageUrl &&
                (!previewImageData || !previewImageData.startsWith('data:image/'))
            ) {
                try {
                    const previewByUrl = await swarmClient.setModelPreviewFromMetadataUrl({
                        model: modelName,
                        subtype,
                        image_url: selectedCivitaiImageUrl,
                        preview_image_metadata: null,
                    });
                    if (!previewByUrl?.error) {
                        notifications.show({ title: 'Saved', message: 'Preview image updated', color: 'green' });
                        setPreviewFileName(null);
                        setSelectedCivitaiImageUrl(null);
                        onModelChanged?.();
                        await loadModel();
                        return;
                    }
                    backendError = previewByUrl.error;
                } catch {
                    backendError = 'Network error contacting server';
                }
            }

            let previewToSave = previewImageData;
            if (
                selectedCivitaiImageUrl &&
                (!previewToSave || !previewToSave.startsWith('data:image/'))
            ) {
                previewToSave = await convertImageUrlToDataUrl(selectedCivitaiImageUrl);
            }
            if (!previewToSave || !previewToSave.startsWith('data:image/')) {
                const detail = backendError
                    ? `Server could not fetch the image: ${backendError}. If this is NSFW content, ensure your CivitAI API key is configured in User Settings.`
                    : 'Could not convert the selected preview image into a savable format.';
                notifications.show({
                    title: 'Save Failed',
                    message: detail,
                    color: 'red',
                    autoClose: 8000,
                });
                return;
            }

            const modelAny = model as unknown as { prediction_type?: string };
            const response = await swarmClient.editModelMetadata({
                model: modelName,
                title: title || model.title || modelName,
                author: author || model.author || '',
                type: model.architecture || '',
                description: description || model.description || '',
                standard_width: standardWidth || model.standard_width || 0,
                standard_height: standardHeight || model.standard_height || 0,
                usage_hint: usageHint || model.usage_hint || '',
                date: model.date || '',
                license: license || model.license || '',
                trigger_phrase: triggerPhrase || model.trigger_phrase || '',
                prediction_type: typeof modelAny.prediction_type === 'string' ? modelAny.prediction_type : '',
                tags: tags || (Array.isArray(model.tags) ? model.tags.join(', ') : ''),
                preview_image: previewToSave,
                subtype,
            });
            if (response.error) {
                notifications.show({ title: 'Save Failed', message: response.error, color: 'red' });
                return;
            }
            notifications.show({ title: 'Saved', message: 'Preview image updated', color: 'green' });
            setPreviewFileName(null);
            setSelectedCivitaiImageUrl(null);
            onModelChanged?.();
            await loadModel();
        } catch {
            notifications.show({ title: 'Error', message: 'Failed to save preview image', color: 'red' });
        } finally {
            setSavingPreview(false);
        }
    };

    const handleSelectCivitaiPreview = async (imageUrl: string, index: number) => {
        setConvertingCivitaiImage(true);
        setSelectedCivitaiImageIndex(index);
        setSelectedCivitaiImageUrl(imageUrl);
        setPreviewFileName(`CivitAI preview ${index + 1}`);
        try {
            // Eagerly convert to data URI via backend proxy so Save has the data ready
            const dataUri = await swarmClient.forwardMetadataImageRequest(imageUrl);
            if (dataUri && dataUri.startsWith('data:image/')) {
                setPreviewImageData(dataUri);
                notifications.show({ title: 'Preview Updated', message: 'Selected CivitAI preview image', color: 'green' });
            } else {
                // Backend proxy failed; keep URL as fallback, Save will try again
                setPreviewImageData(imageUrl);
                notifications.show({ title: 'Preview Updated', message: 'Selected CivitAI preview image (server conversion pending)', color: 'blue' });
            }
        } catch {
            setPreviewImageData(imageUrl);
            notifications.show({ title: 'Preview Updated', message: 'Selected CivitAI preview image (server conversion pending)', color: 'blue' });
        } finally {
            setConvertingCivitaiImage(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={model?.title || modelName}
            size="lg"
            centered
        >
            {loading ? (
                <Center h={300}><Loader size="lg" /></Center>
            ) : model ? (
                <Stack gap="md">
                    {/* Preview + Badges */}
                    <Group align="flex-start" gap="md">
                        {previewUrl && (
                            <Box style={{
                                width: 160,
                                height: 160,
                                borderRadius: 8,
                                overflow: 'hidden',
                                backgroundColor: 'var(--theme-gray-6)',
                                flexShrink: 0,
                            }}>
                                <LazyImage
                                    src={previewUrl}
                                    alt={model.title || model.name}
                                    fit="cover"
                                    height="100%"
                                    width="100%"
                                />
                            </Box>
                        )}
                        <Stack gap="xs" style={{ flex: 1 }}>
                            <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                                {model.name}
                            </Text>
                            <Group gap="xs">
                                {model.architecture && <SwarmBadge tone="secondary" size="sm">{model.architecture}</SwarmBadge>}
                                {model.class && <SwarmBadge tone="info" emphasis="soft" size="sm">{model.class}</SwarmBadge>}
                                {model.loaded && <Badge color="green" size="sm">Loaded</Badge>}
                                {!model.is_supported_model_format && <Badge color="orange" size="sm">Unsupported Format</Badge>}
                            </Group>
                            {model.standard_width > 0 && (
                                <Text size="xs" c="dimmed">
                                    Default: {model.standard_width} x {model.standard_height}
                                </Text>
                            )}
                            {Array.isArray(model.tags) && model.tags.length > 0 && (
                                <Group gap={4} style={{ maxWidth: '100%' }}>
                                    {model.tags.map(tag => (
                                        <Badge
                                            key={tag}
                                            size="xs"
                                            variant="outline"
                                            style={{
                                                maxWidth: 200,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                            title={tag}
                                        >
                                            {tag}
                                        </Badge>
                                    ))}
                                </Group>
                            )}
                            {model.hash && (
                                <Text size="xs" c="dimmed" style={{ fontFamily: 'monospace' }}>
                                    Hash: {model.hash}
                                </Text>
                            )}
                            <Group gap="xs">
                                {model.local && <SwarmBadge tone="success" emphasis="soft" size="xs">Local</SwarmBadge>}
                                {model.is_negative_embedding && <SwarmBadge tone="warning" emphasis="soft" size="xs">Negative Embedding</SwarmBadge>}
                                {model.compat_class && <SwarmBadge tone="secondary" emphasis="outline" size="xs">{model.compat_class}</SwarmBadge>}
                            </Group>
                            <Stack gap={6}>
                                <Text size="xs" fw={600}>Preview Image</Text>
                                <Group gap="xs">
                                    <FileButton onChange={handlePreviewFileSelect} accept="image/png,image/jpeg,image/webp,image/gif">
                                        {(props) => (
                                            <SwarmButton
                                                {...props}
                                                tone="info"
                                                emphasis="soft"
                                                size="xs"
                                                leftSection={<IconPhoto size={14} />}
                                            >
                                                Choose Image
                                            </SwarmButton>
                                        )}
                                    </FileButton>
                                    <SwarmButton
                                        tone="danger"
                                        emphasis="soft"
                                        size="xs"
                                        leftSection={<IconTrash size={14} />}
                                        onClick={() => {
                                            setPreviewImageData(null);
                                            setPreviewFileName(null);
                                            setSelectedCivitaiImageUrl(null);
                                        }}
                                    >
                                        Clear
                                    </SwarmButton>
                                    <SwarmButton
                                        tone="success"
                                        emphasis="solid"
                                        size="xs"
                                        loading={savingPreview}
                                        disabled={previewFileName === null || convertingCivitaiImage}
                                        onClick={handleSavePreview}
                                    >
                                        Save Preview
                                    </SwarmButton>
                                </Group>
                                {previewFileName && (
                                    <Text size="xs" c="dimmed">
                                        Selected: {previewFileName}
                                    </Text>
                                )}
                                {loadingCivitaiImages && (
                                    <Text size="xs" c="dimmed">Loading CivitAI preview options...</Text>
                                )}
                                {civitaiImageError && (
                                    <Text size="xs" c="red">{civitaiImageError}</Text>
                                )}
                                {civitaiImages.length > 0 && (
                                    <Stack gap={6}>
                                        <Text size="xs" c="dimmed">
                                            CivitAI preview options (same source as Model Downloader)
                                        </Text>
                                        <Box
                                            style={{
                                                overflowX: 'auto',
                                                overflowY: 'hidden',
                                                width: '100%',
                                                paddingBottom: 4,
                                            }}
                                        >
                                            <Group gap="xs" wrap="nowrap">
                                                {civitaiImages.map((img, index) => (
                                                    <Box
                                                        key={`${img}-${index}`}
                                                        component="button"
                                                        type="button"
                                                        onClick={() => void handleSelectCivitaiPreview(img, index)}
                                                        style={{
                                                            border:
                                                                index === selectedCivitaiImageIndex
                                                                    ? '2px solid var(--mantine-color-blue-5)'
                                                                    : '1px solid var(--mantine-color-gray-4)',
                                                            borderRadius: 8,
                                                            padding: 2,
                                                            background: 'transparent',
                                                            cursor: 'pointer',
                                                            lineHeight: 0,
                                                        }}
                                                    >
                                                        <LazyImage
                                                            src={img}
                                                            alt={`CivitAI preview ${index + 1}`}
                                                            fit="cover"
                                                            width={58}
                                                            height={58}
                                                        />
                                                    </Box>
                                                ))}
                                            </Group>
                                        </Box>
                                    </Stack>
                                )}
                            </Stack>
                        </Stack>
                    </Group>

                    {/* View/Edit Fields */}
                    {editing ? (
                        <Stack gap="sm">
                            <TextInput label="Title" value={title} onChange={e => setTitle(e.currentTarget.value)} />
                            <Textarea label="Description" value={description} onChange={e => setDescription(e.currentTarget.value)} minRows={3} autosize />
                            <TextInput label="Trigger Phrase" value={triggerPhrase} onChange={e => setTriggerPhrase(e.currentTarget.value)} />
                            <SwarmButton
                                size="xs"
                                tone="secondary"
                                emphasis="ghost"
                                rightSection={showAdvancedEdit ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                                onClick={() => setShowAdvancedEdit((v) => !v)}
                            >
                                {showAdvancedEdit ? 'Hide Advanced Fields' : 'Show Advanced Fields'}
                            </SwarmButton>
                            <Collapse in={showAdvancedEdit}>
                                <Stack gap="sm">
                                    <TextInput label="Author" value={author} onChange={e => setAuthor(e.currentTarget.value)} />
                                    <TextInput label="Tags (comma-separated)" value={tags} onChange={e => setTags(e.currentTarget.value)} />
                                    <Group>
                                        <NumberInput label="Width" value={standardWidth} onChange={v => setStandardWidth(Number(v) || 512)} min={64} max={8192} step={64} w={120} />
                                        <NumberInput label="Height" value={standardHeight} onChange={v => setStandardHeight(Number(v) || 512)} min={64} max={8192} step={64} w={120} />
                                    </Group>
                                    <TextInput label="Usage Hint" value={usageHint} onChange={e => setUsageHint(e.currentTarget.value)} />
                                    <TextInput label="License" value={license} onChange={e => setLicense(e.currentTarget.value)} />
                                </Stack>
                            </Collapse>
                            <Group justify="flex-end">
                                <SwarmButton tone="secondary" emphasis="ghost" onClick={() => setEditing(false)}>Cancel</SwarmButton>
                                <SwarmButton tone="brand" loading={saving} onClick={handleSave}>Save</SwarmButton>
                            </Group>
                        </Stack>
                    ) : (
                        <Stack gap="xs">
                            {description && (
                                <Stack gap={4}>
                                    <Text size="sm" fw={600}>Description</Text>
                                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                                        {showFullDescription || description.length <= 320
                                            ? description
                                            : `${description.slice(0, 320)}...`}
                                    </Text>
                                    {description.length > 320 && (
                                        <SwarmButton
                                            size="xs"
                                            tone="secondary"
                                            emphasis="ghost"
                                            onClick={() => setShowFullDescription((v) => !v)}
                                        >
                                            {showFullDescription ? 'Show Less' : 'Show More'}
                                        </SwarmButton>
                                    )}
                                </Stack>
                            )}
                            {model.trigger_phrase && (
                                <Text size="sm">
                                    <Text span fw={600} c="var(--theme-gray-1)">Trigger Phrase:</Text>{' '}
                                    <Text span c="var(--theme-accent)" fw={500}>{model.trigger_phrase}</Text>
                                </Text>
                            )}
                            {onAddTriggerToPrompt && triggerKeywords.length > 0 && (
                                <Stack gap={6}>
                                    <Text size="xs" fw={600} c="var(--theme-gray-1)">Trigger Keywords (click to add)</Text>
                                    <Group gap={6}>
                                        {triggerKeywords.map((keyword) => (
                                            <SwarmBadge
                                                key={keyword}
                                                tone="success"
                                                emphasis="soft"
                                                size="sm"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => {
                                                    onAddTriggerToPrompt(keyword);
                                                    notifications.show({
                                                        title: 'Trigger Added',
                                                        message: `Added "${keyword}" to prompt`,
                                                        color: 'green',
                                                    });
                                                }}
                                            >
                                                {keyword}
                                            </SwarmBadge>
                                        ))}
                                    </Group>
                                </Stack>
                            )}
                            <SwarmButton
                                size="xs"
                                tone="secondary"
                                emphasis="ghost"
                                rightSection={showAdvanced ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                                onClick={() => setShowAdvanced((v) => !v)}
                            >
                                {showAdvanced ? 'Hide Advanced Details' : 'Show Advanced Details'}
                            </SwarmButton>
                            <Collapse in={showAdvanced}>
                                <Stack gap={6}>
                                    {model.author && <Text size="sm"><strong>Author:</strong> {model.author}</Text>}
                                    {model.usage_hint && <Text size="sm"><strong>Usage Hint:</strong> {model.usage_hint}</Text>}
                                    {model.license && <Text size="sm"><strong>License:</strong> {model.license}</Text>}
                                    {model.date && <Text size="sm"><strong>Date:</strong> {model.date}</Text>}
                                </Stack>
                            </Collapse>
                            <Group justify="flex-end" mt="sm">
                                <SwarmButton tone="secondary" emphasis="outline" onClick={() => setEditing(true)}>
                                    Edit Metadata
                                </SwarmButton>
                            </Group>
                        </Stack>
                    )}
                </Stack>
            ) : null}
        </Modal>
    );
}
