import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    ActionIcon,
    Checkbox,
    Group,
    Progress,
    Select,
    Slider,
    Stack,
    Text,
    TextInput,
    Tooltip,
} from '@mantine/core';
import {
    IconCircleCheck,
    IconCircleX,
    IconDownload,
    IconPlugConnected,
    IconSparkles,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useShallow } from 'zustand/react/shallow';
import { SwarmButton } from '../../components/ui/SwarmButton';
import { ElevatedCard } from '../../components/ui/ElevatedCard';
import { useRoleplayStore } from '../../stores/roleplayStore';
import { useGenerationStore } from '../../store/generationStore';
import { useModels } from '../../hooks/useModels';
import { useModelLoading } from '../../hooks/useModelLoading';
import { generateSceneDescription } from '../../services/roleplayChatService';
import { swarmClient } from '../../api/client';
import { resolveAssetUrl, resolveRuntimeEndpoints } from '../../config/runtimeEndpoints';

const STEPS_MARKS = [{ value: 20, label: '20' }, { value: 50, label: '50' }];
const CFG_MARKS = [{ value: 7, label: '7' }, { value: 15, label: '15' }];

interface ControlsPanelProps {
    onProbeConnection: () => void;
    onRegisterGenerate?: (fn: () => void) => void;
    onRegisterGenerateWithPrompt?: (fn: (prompt: string) => void) => void;
}

export function ControlsPanel({
    onProbeConnection,
    onRegisterGenerate,
    onRegisterGenerateWithPrompt,
}: ControlsPanelProps) {
    const [clipOverride, setClipOverride] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [openSections, setOpenSections] = useState<string[]>([
        'llm',
        'image',
    ]);

    const {
        activeCharacterId,
        conversations,
        connectionStatus,
        connectionMessage,
        lmStudioEndpoint,
        setLmStudioEndpoint,
        detectedServerMode,
        selectedModelId,
        setSelectedModelId,
        availableModels,
        imageSteps,
        imageCfgScale,
        imageClipStopAtLayer,
        imageModelId,
        imageWidth,
        imageHeight,
        chatTemperature,
        chatMaxTokens,
        setImageSteps,
        setImageCfgScale,
        setImageClipStopAtLayer,
        setImageModelId,
        setImageDimensions,
        setChatTemperature,
        setChatMaxTokens,
        getActiveCharacter,
        attachSceneImageToLastMessage,
    } = useRoleplayStore(
        useShallow((s) => ({
            activeCharacterId: s.activeCharacterId,
            conversations: s.conversations,
            connectionStatus: s.connectionStatus,
            connectionMessage: s.connectionMessage,
            lmStudioEndpoint: s.lmStudioEndpoint,
            setLmStudioEndpoint: s.setLmStudioEndpoint,
            detectedServerMode: s.detectedServerMode,
            selectedModelId: s.selectedModelId,
            setSelectedModelId: s.setSelectedModelId,
            availableModels: s.availableModels,
            imageSteps: s.imageSteps,
            imageCfgScale: s.imageCfgScale,
            imageClipStopAtLayer: s.imageClipStopAtLayer,
            imageModelId: s.imageModelId,
            imageWidth: s.imageWidth,
            imageHeight: s.imageHeight,
            chatTemperature: s.chatTemperature,
            chatMaxTokens: s.chatMaxTokens,
            setImageSteps: s.setImageSteps,
            setImageCfgScale: s.setImageCfgScale,
            setImageClipStopAtLayer: s.setImageClipStopAtLayer,
            setImageModelId: s.setImageModelId,
            setImageDimensions: s.setImageDimensions,
            setChatTemperature: s.setChatTemperature,
            setChatMaxTokens: s.setChatMaxTokens,
            getActiveCharacter: s.getActiveCharacter,
            attachSceneImageToLastMessage: s.attachSceneImageToLastMessage,
        }))
    );

    const activeCharacter = getActiveCharacter();
    const messages = useMemo(
        () => (activeCharacterId ? conversations[activeCharacterId] ?? [] : []),
        [activeCharacterId, conversations]
    );

    const generatePageModel = useGenerationStore((s) => s.selectedModel);
    const effectiveModel = imageModelId || generatePageModel;

    const { data: sdModels, isLoading: loadingModels } = useModels('Stable-Diffusion');
    const { isLoading: isLoadingModel, progress: modelLoadProgress, loadModel } = useModelLoading();

    const swarmBaseUrl = useMemo(
        () => resolveRuntimeEndpoints().apiBaseUrl || window.location.origin,
        []
    );

    // Auto-collapse / expand connection section based on status
    useEffect(() => {
        if (connectionStatus === 'connected') {
            setOpenSections((prev) => prev.filter((s) => s !== 'connection'));
        } else {
            setOpenSections((prev) =>
                prev.includes('connection') ? prev : ['connection', ...prev]
            );
        }
    }, [connectionStatus]);

    // Sync clip override toggle with stored value
    useEffect(() => {
        setClipOverride(imageClipStopAtLayer !== null);
    }, [imageClipStopAtLayer]);

    const handleLoadModel = () => {
        if (effectiveModel) loadModel(effectiveModel);
    };

    const handleClipToggle = (checked: boolean) => {
        setClipOverride(checked);
        setImageClipStopAtLayer(checked ? -1 : null);
    };

    /**
     * Core image generation — takes a fully resolved prompt, applies image settings and
     * character LoRA, then calls SwarmUI. Used by both the LLM-driven path and the
     * [SCENE: ...] tag bypass.
     */
    const generateImageWithPrompt = useCallback((fullPrompt: string) => {
        if (!activeCharacter) return;
        setIsGeneratingImage(true);
        const ipAdapterParams =
            activeCharacter.ipAdapterEnabled && activeCharacter.avatar
                ? {
                      useipapterforrevision: activeCharacter.ipAdapterModel ?? 'faceid plus v2',
                      ipadapterweight: activeCharacter.ipAdapterWeight ?? 1.0,
                      ipadapterstart: 0.0,
                      ipadapterend: 1.0,
                      ipadapterweighttype: 'standard',
                      promptimages: activeCharacter.avatar,
                  }
                : {};
        swarmClient.generateImage(
            {
                prompt: fullPrompt,
                ...(effectiveModel ? { model: effectiveModel } : {}),
                width: imageWidth,
                height: imageHeight,
                images: 1,
                steps: imageSteps,
                cfgscale: imageCfgScale,
                ...(imageClipStopAtLayer !== null ? { clipstopatlayer: imageClipStopAtLayer } : {}),
                ...(activeCharacter.characterLora
                    ? { loras: activeCharacter.characterLora, loraweights: String(activeCharacter.characterLoraWeight ?? 0.8) }
                    : {}),
                ...ipAdapterParams,
            },
            {
                onImage: (data: { image?: string }) => {
                    const imagePath = resolveAssetUrl(data.image?.startsWith('/') ? data.image : `/${data.image}`);
                    if (activeCharacterId) {
                        attachSceneImageToLastMessage(activeCharacterId, imagePath);
                    }
                },
                onComplete: () => setIsGeneratingImage(false),
                onError: () => {
                    notifications.show({ title: 'Image Generation Failed', message: 'SwarmUI could not generate the scene image.', color: 'red' });
                    setIsGeneratingImage(false);
                },
                onDataError: (errorMessage: string) => {
                    notifications.show({ title: 'Image Generation Error', message: errorMessage, color: 'red' });
                    setIsGeneratingImage(false);
                },
            }
        );
    }, [activeCharacter, effectiveModel, imageWidth, imageHeight, imageSteps, imageCfgScale, imageClipStopAtLayer, activeCharacterId, attachSceneImageToLastMessage]);

    /**
     * LLM-driven scene generation: asks the LLM to describe the current scene,
     * then feeds that description into generateImageWithPrompt.
     */
    const handleGenerateScene = useCallback(async () => {
        if (!activeCharacter || !detectedServerMode || connectionStatus !== 'connected') {
            notifications.show({
                title: 'Cannot Generate',
                message: 'Connect to LM Studio and select a character first.',
                color: 'orange',
            });
            return;
        }

        if (messages.length === 0) {
            notifications.show({
                title: 'No Conversation',
                message: 'Start a conversation before generating a scene.',
                color: 'orange',
            });
            return;
        }

        setIsGeneratingImage(true);

        const recentMessages = messages.slice(-6);
        const contextStr = recentMessages
            .map((m) => `${m.role === 'user' ? 'User' : 'Character'}: ${m.content}`)
            .join('\n');

        const sceneSuggestionPrompt =
            activeCharacter.sceneSuggestionPrompt ??
            'Based on the conversation, describe the current visual scene in a single vivid sentence suitable as an image generation prompt. Focus on setting, lighting, and mood.';

        const sceneResult = await generateSceneDescription({
            endpointUrl: lmStudioEndpoint,
            serverMode: detectedServerMode,
            modelId: selectedModelId,
            conversationContext: contextStr,
            sceneSuggestionPrompt,
        });

        if (!sceneResult.success) {
            notifications.show({
                title: 'Scene Description Failed',
                message: sceneResult.error ?? 'Could not generate scene description.',
                color: 'red',
            });
            setIsGeneratingImage(false);
            return;
        }

        const appearancePrefix = activeCharacter.appearancePrompt
            ? `${activeCharacter.appearancePrompt}, `
            : '';
        generateImageWithPrompt(appearancePrefix + sceneResult.description);
    }, [
        activeCharacter,
        detectedServerMode,
        connectionStatus,
        messages,
        lmStudioEndpoint,
        selectedModelId,
        generateImageWithPrompt,
    ]);

    /**
     * Bypass path: use a prompt already written by the AI via [SCENE: ...] tag.
     * Skips the LLM scene-description step entirely.
     */
    const handleGenerateSceneWithPrompt = useCallback((prompt: string) => {
        if (!activeCharacter) {
            notifications.show({
                title: 'Cannot Generate',
                message: 'Select a character first.',
                color: 'orange',
            });
            return;
        }

        const appearancePrefix = activeCharacter.appearancePrompt
            ? `${activeCharacter.appearancePrompt}, `
            : '';
        generateImageWithPrompt(appearancePrefix + prompt);
    }, [activeCharacter, generateImageWithPrompt]);

    // Register both generate functions with parent for cross-panel access
    useEffect(() => {
        onRegisterGenerate?.(handleGenerateScene);
    }, [onRegisterGenerate, handleGenerateScene]);

    useEffect(() => {
        onRegisterGenerateWithPrompt?.(handleGenerateSceneWithPrompt);
    }, [onRegisterGenerateWithPrompt, handleGenerateSceneWithPrompt]);

    const isConnected = connectionStatus === 'connected';
    const isConnecting = connectionStatus === 'connecting';

    const connectionSummary = isConnected
        ? `LM Studio: ${selectedModelId || 'connected'} | SwarmUI: Ready`
        : null;

    return (
        <Stack h="100%" gap={0} p="xs" style={{ overflow: 'auto' }}>
            <Accordion
                variant="separated"
                radius="sm"
                multiple
                value={openSections}
                onChange={setOpenSections}
            >
                {/* ── Connection Status ──────────────────────────────────────── */}
                <Accordion.Item value="connection">
                    <Accordion.Control
                        icon={
                            isConnected
                                ? <IconCircleCheck size={16} color="var(--theme-success)" />
                                : <IconCircleX size={16} color="var(--theme-error)" />
                        }
                    >
                        <Group justify="space-between" wrap="nowrap" style={{ flex: 1 }}>
                            <Text size="sm" fw={600}>Connection Status</Text>
                            {isConnected && !openSections.includes('connection') && (
                                <Text size="xs" c="dimmed" truncate style={{ maxWidth: 200 }}>
                                    {connectionSummary}
                                </Text>
                            )}
                        </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="xs">
                            {/* LM Studio card */}
                            <ElevatedCard elevation="floor">
                                <Stack gap="xs">
                                    <Group gap="xs">
                                        <div
                                            style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                backgroundColor: isConnected
                                                    ? 'var(--theme-success)'
                                                    : isConnecting
                                                    ? 'var(--theme-warning)'
                                                    : 'var(--theme-error)',
                                                flexShrink: 0,
                                            }}
                                        />
                                        <Text size="xs" fw={600}>LM Studio</Text>
                                        {connectionMessage && (
                                            <Text size="xs" c="dimmed" truncate>
                                                {connectionMessage}
                                            </Text>
                                        )}
                                    </Group>
                                    <TextInput
                                        size="xs"
                                        label="Endpoint"
                                        value={lmStudioEndpoint}
                                        onChange={(e) => setLmStudioEndpoint(e.currentTarget.value)}
                                        placeholder="http://localhost:1234"
                                    />
                                    {detectedServerMode && (
                                        <Text size="xs" c="dimmed">
                                            API mode: {detectedServerMode}
                                        </Text>
                                    )}
                                    {(availableModels ?? []).length > 0 && (
                                        <Select
                                            size="xs"
                                            label="Model"
                                            placeholder="Select model…"
                                            value={selectedModelId || null}
                                            onChange={(v) => setSelectedModelId(v ?? '')}
                                            data={(availableModels ?? []).map((m) => ({
                                                value: m.id,
                                                label: m.id,
                                            }))}
                                            searchable
                                            nothingFoundMessage="No models found"
                                        />
                                    )}
                                    <SwarmButton
                                        tone="brand"
                                        emphasis="soft"
                                        size="xs"
                                        leftSection={<IconPlugConnected size={14} />}
                                        onClick={onProbeConnection}
                                        loading={isConnecting}
                                    >
                                        Test Connection
                                    </SwarmButton>
                                </Stack>
                            </ElevatedCard>

                            {/* SwarmUI card */}
                            <ElevatedCard elevation="floor" tone="success">
                                <Group gap="xs">
                                    <div
                                        style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--theme-success)',
                                            flexShrink: 0,
                                        }}
                                    />
                                    <Stack gap={2} style={{ flex: 1 }}>
                                        <Text size="xs" fw={600}>SwarmUI Ready</Text>
                                        <Text size="xs" c="dimmed" truncate>
                                            {swarmBaseUrl}
                                        </Text>
                                    </Stack>
                                </Group>
                            </ElevatedCard>
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                {/* ── LLM Parameters ────────────────────────────────────────── */}
                <Accordion.Item value="llm">
                    <Accordion.Control>
                        <Text size="sm" fw={600}>LLM Parameters</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="md" pb="xs">
                            <Select
                                label="Model"
                                size="xs"
                                placeholder="Select model…"
                                value={selectedModelId || null}
                                onChange={(v) => setSelectedModelId(v ?? '')}
                                data={(availableModels ?? []).map((m) => ({
                                    value: m.id,
                                    label: m.id,
                                }))}
                                searchable
                                clearable
                                nothingFoundMessage="No models found"
                            />

                            <div>
                                <Text size="xs" fw={500} mb={4}>
                                    Temperature: {chatTemperature}
                                </Text>
                                <Slider
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={chatTemperature}
                                    onChange={setChatTemperature}
                                    marks={[{ value: 0.8, label: '0.8' }, { value: 1.5, label: '1.5' }]}
                                    size="xs"
                                    label={null}
                                />
                            </div>

                            <div>
                                <Text size="xs" fw={500} mb={4}>
                                    Max Tokens: {chatMaxTokens}
                                </Text>
                                <Slider
                                    min={256}
                                    max={8192}
                                    step={256}
                                    value={chatMaxTokens}
                                    onChange={setChatMaxTokens}
                                    marks={[{ value: 2048, label: '2048' }, { value: 4096, label: '4096' }]}
                                    size="xs"
                                    label={null}
                                />
                            </div>
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                {/* ── Image Generation ──────────────────────────────────────── */}
                <Accordion.Item value="image">
                    <Accordion.Control>
                        <Text size="sm" fw={600}>Image Generation</Text>
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="md" pb="xs">
                            {/* Model selector */}
                            <div>
                                <Group justify="space-between" mb={6}>
                                    <Text size="xs" fw={500}>Model</Text>
                                    {!imageModelId && generatePageModel && (
                                        <Text size="xs" c="dimmed" truncate style={{ maxWidth: 140 }}>
                                            ↳ {generatePageModel.split('/').pop()}
                                        </Text>
                                    )}
                                </Group>
                                <Group gap="xs" wrap="nowrap">
                                    <Select
                                        style={{ flex: 1 }}
                                        size="xs"
                                        placeholder={generatePageModel ? 'From generate page' : 'Select model…'}
                                        value={imageModelId || null}
                                        onChange={(v) => setImageModelId(v ?? '')}
                                        data={(sdModels ?? []).map((m) => ({
                                            value: m.name,
                                            label: m.title || m.name,
                                        }))}
                                        searchable
                                        clearable
                                        disabled={loadingModels}
                                        nothingFoundMessage="No models found"
                                    />
                                    <Tooltip
                                        label={
                                            effectiveModel
                                                ? `Load "${effectiveModel.split('/').pop()}" into SwarmUI`
                                                : 'Select a model first'
                                        }
                                    >
                                        <ActionIcon
                                            variant="default"
                                            size="md"
                                            onClick={handleLoadModel}
                                            loading={isLoadingModel}
                                            disabled={!effectiveModel || isLoadingModel}
                                        >
                                            <IconDownload size={14} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                                {isLoadingModel && (
                                    <Progress
                                        value={modelLoadProgress * 100}
                                        size="xs"
                                        mt={6}
                                        animated
                                    />
                                )}
                            </div>

                            {/* Aspect ratio */}
                            <Select
                                label="Aspect Ratio"
                                size="xs"
                                value={`${imageWidth}x${imageHeight}`}
                                onChange={(v) => {
                                    if (!v) return;
                                    const [w, h] = v.split('x').map(Number);
                                    setImageDimensions(w, h);
                                }}
                                data={[
                                    { value: '768x512', label: 'Landscape (768×512)' },
                                    { value: '512x768', label: 'Portrait (512×768)' },
                                    { value: '512x512', label: 'Square (512×512)' },
                                    { value: '1024x768', label: 'Wide (1024×768)' },
                                ]}
                            />

                            {/* Steps */}
                            <div>
                                <Text size="xs" fw={500} mb={4}>
                                    Steps: {imageSteps}
                                </Text>
                                <Slider
                                    min={1}
                                    max={150}
                                    step={1}
                                    value={imageSteps}
                                    onChange={setImageSteps}
                                    marks={STEPS_MARKS}
                                    size="xs"
                                    label={null}
                                />
                            </div>

                            {/* CFG Scale */}
                            <div>
                                <Text size="xs" fw={500} mb={4}>
                                    CFG Scale: {imageCfgScale}
                                </Text>
                                <Slider
                                    min={1}
                                    max={30}
                                    step={0.5}
                                    value={imageCfgScale}
                                    onChange={setImageCfgScale}
                                    marks={CFG_MARKS}
                                    size="xs"
                                    label={null}
                                />
                            </div>

                            {/* CLIP Stop at Layer */}
                            <div>
                                <Checkbox
                                    label={
                                        <Text size="xs" fw={500}>
                                            Override CLIP stop-at-layer
                                        </Text>
                                    }
                                    checked={clipOverride}
                                    onChange={(e) => handleClipToggle(e.currentTarget.checked)}
                                    size="xs"
                                />
                                {clipOverride && (
                                    <div style={{ marginTop: 8 }}>
                                        <Text size="xs" c="dimmed" mb={4}>
                                            Layer: {imageClipStopAtLayer ?? -1}
                                        </Text>
                                        <Slider
                                            min={-24}
                                            max={-1}
                                            step={1}
                                            value={imageClipStopAtLayer ?? -1}
                                            onChange={(v) => setImageClipStopAtLayer(v)}
                                            size="xs"
                                            label={null}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Generate Scene button */}
                            <SwarmButton
                                tone="brand"
                                emphasis="solid"
                                size="xs"
                                fullWidth
                                leftSection={<IconSparkles size={14} />}
                                onClick={handleGenerateScene}
                                loading={isGeneratingImage}
                                disabled={
                                    connectionStatus !== 'connected' ||
                                    messages.length === 0 ||
                                    isGeneratingImage
                                }
                            >
                                Generate Scene
                            </SwarmButton>
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </Stack>
    );
}
