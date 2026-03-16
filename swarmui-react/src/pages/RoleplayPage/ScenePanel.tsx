import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Accordion,
    ActionIcon,
    Center,
    Checkbox,
    Group,
    Loader,
    Progress,
    Select,
    Slider,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { IconPhoto, IconRefresh, IconSparkles, IconDownload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useShallow } from 'zustand/react/shallow';
import { SwarmButton } from '../../components/ui/SwarmButton';
import { useRoleplayStore } from '../../stores/roleplayStore';
import { useGenerationStore } from '../../store/generationStore';
import { useModels } from '../../hooks/useModels';
import { useModelLoading } from '../../hooks/useModelLoading';
import { generateSceneDescription } from '../../services/roleplayChatService';
import { swarmClient } from '../../api/client';
import { resolveAssetUrl } from '../../config/runtimeEndpoints';

const STEPS_MARKS = [{ value: 20, label: '20' }, { value: 50, label: '50' }];
const CFG_MARKS = [{ value: 7, label: '7' }, { value: 15, label: '15' }];

interface ScenePanelProps {
    onRegisterGenerate?: (fn: () => void) => void;
    onRegisterGenerateWithPrompt?: (fn: (prompt: string) => void) => void;
}

export function ScenePanel({ onRegisterGenerate, onRegisterGenerateWithPrompt }: ScenePanelProps) {
    const [imageWidth, setImageWidth] = useState(768);
    const [imageHeight, setImageHeight] = useState(512);
    const [clipOverride, setClipOverride] = useState(false);

    const {
        sceneImage,
        isGeneratingImage,
        activeCharacterId,
        conversations,
        lmStudioEndpoint,
        detectedServerMode,
        selectedModelId,
        connectionStatus,
        imageSteps,
        imageCfgScale,
        imageClipStopAtLayer,
        imageModelId,
        setSceneImage,
        setGeneratingImage,
        getActiveCharacter,
        attachSceneImageToLastMessage,
        setImageSteps,
        setImageCfgScale,
        setImageClipStopAtLayer,
        setImageModelId,
    } = useRoleplayStore(
        useShallow((s) => ({
            sceneImage: s.sceneImage,
            isGeneratingImage: s.isGeneratingImage,
            activeCharacterId: s.activeCharacterId,
            conversations: s.conversations,
            lmStudioEndpoint: s.lmStudioEndpoint,
            detectedServerMode: s.detectedServerMode,
            selectedModelId: s.selectedModelId,
            connectionStatus: s.connectionStatus,
            imageSteps: s.imageSteps,
            imageCfgScale: s.imageCfgScale,
            imageClipStopAtLayer: s.imageClipStopAtLayer,
            imageModelId: s.imageModelId,
            setSceneImage: s.setSceneImage,
            setGeneratingImage: s.setGeneratingImage,
            getActiveCharacter: s.getActiveCharacter,
            attachSceneImageToLastMessage: s.attachSceneImageToLastMessage,
            setImageSteps: s.setImageSteps,
            setImageCfgScale: s.setImageCfgScale,
            setImageClipStopAtLayer: s.setImageClipStopAtLayer,
            setImageModelId: s.setImageModelId,
        }))
    );

    const activeCharacter = getActiveCharacter();
    const messages = useMemo(
        () => (activeCharacterId ? conversations[activeCharacterId] ?? [] : []),
        [activeCharacterId, conversations]
    );

    // ── Model selection ───────────────────────────────────────────────────
    // imageModelId from roleplay store overrides the generate page's selected model.
    // Empty = fall back to whatever the generate page has selected.
    const generatePageModel = useGenerationStore((s) => s.selectedModel);
    const effectiveModel = imageModelId || generatePageModel;

    const { data: sdModels, isLoading: loadingModels } = useModels('Stable-Diffusion');
    const { isLoading: isLoadingModel, progress: modelLoadProgress, loadModel } = useModelLoading();

    const handleLoadModel = () => {
        if (effectiveModel) loadModel(effectiveModel);
    };

    // Sync clip override toggle with stored value
    useEffect(() => {
        setClipOverride(imageClipStopAtLayer !== null);
    }, [imageClipStopAtLayer]);

    /**
     * Core image generation — takes a fully resolved prompt, applies image settings and
     * character LoRA, then calls SwarmUI. Used by both the LLM-driven path and the
     * [SCENE: ...] tag bypass.
     */
    const generateImageWithPrompt = useCallback((fullPrompt: string) => {
        if (!activeCharacter) return;
        setGeneratingImage(true);

        // Build IP-Adapter FaceID params if the character has a portrait and FaceID enabled.
        // Uses SwarmUI's built-in IP-Adapter workflow step — no LoRA required.
        // Requires: ComfyUI-IPAdapter-plus node pack + ip-adapter-faceid-plusv2_sdxl model.
        const ipAdapterParams =
            activeCharacter.ipAdapterEnabled && activeCharacter.avatar
                ? {
                      useipapterforrevision: activeCharacter.ipAdapterModel ?? 'faceid plus v2',
                      ipadapterweight: activeCharacter.ipAdapterWeight ?? 1.0,
                      ipadapterstart: 0.0,
                      ipadapterend: 1.0,
                      ipadapterweighttype: 'standard',
                      promptimages: activeCharacter.avatar, // data URL sent directly
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
                ...(imageClipStopAtLayer !== null
                    ? { clipstopatlayer: imageClipStopAtLayer }
                    : {}),
                ...(activeCharacter.characterLora
                    ? {
                          loras: activeCharacter.characterLora,
                          loraweights: String(activeCharacter.characterLoraWeight ?? 0.8),
                      }
                    : {}),
                ...ipAdapterParams,
            },
            {
                onImage: (data: { image?: string }) => {
                    const imagePath = resolveAssetUrl(
                        data.image?.startsWith('/') ? data.image : `/${data.image}`
                    );
                    setSceneImage(imagePath);
                    if (activeCharacterId) {
                        attachSceneImageToLastMessage(activeCharacterId, imagePath);
                    }
                },
                onComplete: () => {
                    setGeneratingImage(false);
                },
                onError: () => {
                    notifications.show({
                        title: 'Image Generation Failed',
                        message: 'SwarmUI could not generate the scene image.',
                        color: 'red',
                    });
                    setGeneratingImage(false);
                },
                onDataError: (errorMessage: string) => {
                    notifications.show({
                        title: 'Image Generation Error',
                        message: errorMessage,
                        color: 'red',
                    });
                    setGeneratingImage(false);
                },
            }
        );
    }, [
        activeCharacter,
        effectiveModel,
        imageWidth,
        imageHeight,
        imageSteps,
        imageCfgScale,
        imageClipStopAtLayer,
        activeCharacterId,
        setSceneImage,
        setGeneratingImage,
        attachSceneImageToLastMessage,
    ]);

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

        setGeneratingImage(true);

        // Build conversation context
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
            setGeneratingImage(false);
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
        setGeneratingImage,
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

    const handleClipToggle = (checked: boolean) => {
        setClipOverride(checked);
        setImageClipStopAtLayer(checked ? -1 : null);
    };

    const hasScene = !!sceneImage;

    return (
        <Stack h="100%" gap={0}>
            {/* Header */}
            <Text
                size="sm"
                fw={600}
                p="xs"
                c="var(--theme-text-primary)"
                style={{ borderBottom: '1px solid var(--theme-gray-5)' }}
            >
                Scene
            </Text>

            <Stack flex={1} p="xs" gap="xs" style={{ overflow: 'auto' }}>
                {/* Image Display */}
                {sceneImage ? (
                    <div style={{ position: 'relative' }}>
                        <img
                            src={sceneImage}
                            alt="Generated scene"
                            style={{
                                width: '100%',
                                borderRadius: 'calc(8px * var(--theme-radius-multiplier))',
                                objectFit: 'contain',
                                display: 'block',
                            }}
                        />
                        {isGeneratingImage && (
                            <div
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    borderRadius: 'calc(8px * var(--theme-radius-multiplier))',
                                }}
                            >
                                <Stack align="center" gap="xs">
                                    <Loader size="md" color="white" />
                                    <Text size="xs" c="white">Regenerating...</Text>
                                </Stack>
                            </div>
                        )}
                    </div>
                ) : (
                    <Center
                        style={{
                            aspectRatio: `${imageWidth}/${imageHeight}`,
                            border: '1px dashed var(--theme-gray-5)',
                            borderRadius: 'calc(8px * var(--theme-radius-multiplier))',
                            backgroundColor: 'var(--elevation-floor)',
                        }}
                    >
                        {isGeneratingImage ? (
                            <Stack align="center" gap="xs">
                                <Loader size="md" />
                                <Text size="xs" c="dimmed">Generating scene...</Text>
                            </Stack>
                        ) : (
                            <Stack align="center" gap="xs">
                                <IconPhoto size={32} color="var(--theme-gray-4)" />
                                <Text size="xs" c="dimmed">No scene generated</Text>
                            </Stack>
                        )}
                    </Center>
                )}

                {/* Generate / Regenerate Button */}
                <SwarmButton
                    tone="brand"
                    emphasis="solid"
                    size="xs"
                    fullWidth
                    leftSection={hasScene ? <IconRefresh size={14} /> : <IconSparkles size={14} />}
                    onClick={handleGenerateScene}
                    loading={isGeneratingImage}
                    disabled={
                        connectionStatus !== 'connected' ||
                        messages.length === 0 ||
                        isGeneratingImage
                    }
                >
                    {hasScene ? 'Regenerate Scene' : 'Generate Scene'}
                </SwarmButton>

                {/* Aspect Ratio */}
                <Select
                    label="Aspect"
                    size="xs"
                    value={`${imageWidth}x${imageHeight}`}
                    onChange={(v) => {
                        if (!v) return;
                        const [w, h] = v.split('x').map(Number);
                        setImageWidth(w);
                        setImageHeight(h);
                    }}
                    data={[
                        { value: '768x512', label: 'Landscape (768×512)' },
                        { value: '512x768', label: 'Portrait (512×768)' },
                        { value: '512x512', label: 'Square (512×512)' },
                        { value: '1024x768', label: 'Wide (1024×768)' },
                    ]}
                />

                {/* Image Settings Accordion */}
                <Accordion variant="contained" radius="sm">
                    <Accordion.Item value="settings">
                        <Accordion.Control>
                            <Text size="xs" fw={600}>Image Settings</Text>
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
                                            placeholder={generatePageModel
                                                ? `From generate page`
                                                : 'Select model…'}
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
                                        <Tooltip label={effectiveModel
                                            ? `Load "${effectiveModel.split('/').pop()}" into SwarmUI`
                                            : 'Select a model first'}>
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
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>
            </Stack>
        </Stack>
    );
}
