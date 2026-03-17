# Roleplay Page UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Scene panel with a Controls panel showing connection status + LLM/image parameters, enrich the Character sidebar with an active character profile, and improve Chat panel visuals and input behavior.

**Architecture:** Replace-in-place approach. Same three-panel flex layout. New `ControlsPanel.tsx` replaces `ScenePanel.tsx`. Store gains temperature, maxTokens, and image dimension fields. Image generation logic relocates from ScenePanel into ControlsPanel.

**Tech Stack:** React 18, Zustand (persist middleware), Mantine v7, TypeScript, Vite

**Spec:** `docs/superpowers/specs/2026-03-17-roleplay-ui-overhaul-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/stores/roleplayStore.ts` | Modify | Add chatTemperature, chatMaxTokens, imageWidth, imageHeight; remove sceneImage, isGeneratingImage |
| `src/services/roleplayChatService.ts` | Modify | Add temperature/maxTokens to StreamChatInput |
| `src/pages/RoleplayPage/ControlsPanel.tsx` | Create | Connection status, LLM params, image gen params + logic |
| `src/pages/RoleplayPage/CharacterSidebar.tsx` | Modify | Remove connection UI, add active character profile |
| `src/pages/RoleplayPage/ChatPanel.tsx` | Modify | Enter-to-send, darker background, pass temp/maxTokens |
| `src/pages/RoleplayPage/index.tsx` | Modify | Swap ScenePanel → ControlsPanel, rewire props |
| `src/pages/RoleplayPage/ScenePanel.tsx` | Delete | Fully replaced by ControlsPanel |

---

## Chunk 1: Store and Service Foundation

### Task 1: Add new store fields and actions

**Files:**
- Modify: `src/stores/roleplayStore.ts`

- [ ] **Step 1: Add new state fields to the store interface**

In `RoleplayStoreState` interface, add after the `imageModelId` field:

```typescript
// LLM parameters (persisted)
chatTemperature: number;
chatMaxTokens: number;

// Image dimensions (persisted, replaces ScenePanel local state)
imageWidth: number;
imageHeight: number;
```

Add new actions to the interface:

```typescript
setChatTemperature: (v: number) => void;
setChatMaxTokens: (v: number) => void;
setImageDimensions: (width: number, height: number) => void;
```

- [ ] **Step 2: Add default values and action implementations**

In the store's initial state section, add:

```typescript
chatTemperature: 0.8,
chatMaxTokens: 2048,
imageWidth: 768,
imageHeight: 512,
```

Add action implementations:

```typescript
setChatTemperature: (v) => set({ chatTemperature: v }),
setChatMaxTokens: (v) => set({ chatMaxTokens: v }),
setImageDimensions: (width, height) => set({ imageWidth: width, imageHeight: height }),
```

- [ ] **Step 3: Remove sceneImage and isGeneratingImage from store**

Remove these fields from the interface:

```typescript
// DELETE these from interface:
sceneImage: string | null;
isGeneratingImage: boolean;

// DELETE these actions from interface:
setSceneImage: (url: string | null) => void;
setGeneratingImage: (generating: boolean) => void;
```

Remove their initial values:

```typescript
// DELETE:
sceneImage: null,
isGeneratingImage: false,
```

Remove their action implementations:

```typescript
// DELETE:
setSceneImage: (url) => set({ sceneImage: url }),
setGeneratingImage: (generating) => set({ isGeneratingImage: generating }),
```

Also remove `sceneImage: null` from the `clearConversation` action's return object.

- [ ] **Step 4: Update partialize for persistence**

In the `partialize` function, add the new fields and remove old ones:

```typescript
partialize: (state) => ({
    characters: state.characters,
    conversations: state.conversations,
    activeCharacterId: state.activeCharacterId,
    lmStudioEndpoint: state.lmStudioEndpoint,
    selectedModelId: state.selectedModelId,
    imageSteps: state.imageSteps,
    imageCfgScale: state.imageCfgScale,
    imageClipStopAtLayer: state.imageClipStopAtLayer,
    imageModelId: state.imageModelId,
    // NEW:
    chatTemperature: state.chatTemperature,
    chatMaxTokens: state.chatMaxTokens,
    imageWidth: state.imageWidth,
    imageHeight: state.imageHeight,
}),
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd "C:/Users/Phala/SwarmUI/swarmui-react" && npx tsc -b --noEmit`

Expected: Type errors in ScenePanel.tsx (references removed fields) — this is expected and will be resolved when ScenePanel is deleted. ChatPanel.tsx and other files should have no new errors.

- [ ] **Step 6: Commit**

```bash
git add src/stores/roleplayStore.ts
git commit -m "feat(store): add LLM/image params, remove orphaned sceneImage fields"
```

---

### Task 2: Add temperature/maxTokens to StreamChatInput

**Files:**
- Modify: `src/services/roleplayChatService.ts`

- [ ] **Step 1: Extend the StreamChatInput interface**

Add two optional fields to the `StreamChatInput` interface (after `onServerModeCorrection`):

```typescript
temperature?: number;
maxTokens?: number;
```

- [ ] **Step 2: Pass the new fields through in streamRoleplayChat**

In the `streamRoleplayChat` function, where `buildChatBody` is called, pass the new fields:

```typescript
const body = buildChatBody(input.serverMode, input.modelId, input.messages, {
    temperature: input.temperature,
    max_tokens: input.maxTokens,
});
```

Do the same for the retry call inside the `isInputRequiredError` branch:

```typescript
const retryBody = buildChatBody('openai-responses', input.modelId, input.messages, {
    temperature: input.temperature,
    max_tokens: input.maxTokens,
});
```

Note: `buildChatBody` already accepts an options object with `temperature` and `max_tokens` keys and has defaults of 0.8 and 2048. Passing `undefined` values will use those defaults.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "C:/Users/Phala/SwarmUI/swarmui-react" && npx tsc -b --noEmit`

Expected: Same ScenePanel errors as before (expected), no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/roleplayChatService.ts
git commit -m "feat(chat-service): accept temperature/maxTokens in StreamChatInput"
```

---

## Chunk 2: ControlsPanel (new file)

### Task 3: Create ControlsPanel.tsx

**Files:**
- Create: `src/pages/RoleplayPage/ControlsPanel.tsx`

This is the largest task. The panel has three collapsible sections: Connection Status, LLM Parameters, and Image Generation. It also contains the image generation logic migrated from ScenePanel.

- [ ] **Step 1: Create the file with imports, interface, and component shell**

Create `src/pages/RoleplayPage/ControlsPanel.tsx`:

```typescript
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
    IconRefresh,
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
    // Local state
    const [clipOverride, setClipOverride] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    // TODO: sections will be added in following steps
    return (
        <Stack h="100%" gap={0}>
            <Text
                size="sm"
                fw={600}
                p="xs"
                c="var(--theme-text-primary)"
                style={{ borderBottom: '1px solid var(--theme-gray-5)' }}
            >
                Controls
            </Text>
            <Stack flex={1} p="xs" gap="xs" style={{ overflow: 'auto' }}>
                <Text size="sm" c="dimmed">Controls panel placeholder</Text>
            </Stack>
        </Stack>
    );
}
```

- [ ] **Step 2: Add store bindings**

Replace the `// TODO` comment and add the store/hook bindings before the return:

```typescript
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

    // Image model setup (same pattern as ScenePanel)
    const generatePageModel = useGenerationStore((s) => s.selectedModel);
    const effectiveModel = imageModelId || generatePageModel;
    const { data: sdModels, isLoading: loadingModels } = useModels('Stable-Diffusion');
    const { isLoading: isLoadingModel, progress: modelLoadProgress, loadModel } = useModelLoading();

    const handleLoadModel = () => {
        if (effectiveModel) loadModel(effectiveModel);
    };

    // Sync clip override toggle
    useEffect(() => {
        setClipOverride(imageClipStopAtLayer !== null);
    }, [imageClipStopAtLayer]);

    const handleClipToggle = (checked: boolean) => {
        setClipOverride(checked);
        setImageClipStopAtLayer(checked ? -1 : null);
    };

    // Controlled accordion state — auto-collapse connection when connected
    const [openSections, setOpenSections] = useState<string[]>([
        ...(connectionStatus !== 'connected' ? ['connection'] : []),
        'llm',
        'image',
    ]);

    useEffect(() => {
        if (connectionStatus === 'connected') {
            setOpenSections((prev) => prev.filter((s) => s !== 'connection'));
        } else {
            setOpenSections((prev) =>
                prev.includes('connection') ? prev : ['connection', ...prev]
            );
        }
    }, [connectionStatus]);

    // SwarmUI base URL for display
    const swarmBaseUrl = useMemo(() => {
        const endpoints = resolveRuntimeEndpoints();
        return endpoints.apiBaseUrl || window.location.origin;
    }, []);
```

- [ ] **Step 3: Add image generation logic (migrated from ScenePanel)**

Add these three callbacks after the store bindings, before the return statement. These are directly migrated from `ScenePanel.tsx` with `setSceneImage` calls removed and `setGeneratingImage` replaced with local `setIsGeneratingImage`:

```typescript
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
                    if (activeCharacterId) {
                        attachSceneImageToLastMessage(activeCharacterId, imagePath);
                    }
                },
                onComplete: () => setIsGeneratingImage(false),
                onError: () => {
                    notifications.show({
                        title: 'Image Generation Failed',
                        message: 'SwarmUI could not generate the scene image.',
                        color: 'red',
                    });
                    setIsGeneratingImage(false);
                },
                onDataError: (errorMessage: string) => {
                    notifications.show({
                        title: 'Image Generation Error',
                        message: errorMessage,
                        color: 'red',
                    });
                    setIsGeneratingImage(false);
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
        attachSceneImageToLastMessage,
    ]);

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

    // Register generate functions for cross-panel access
    useEffect(() => {
        onRegisterGenerate?.(handleGenerateScene);
    }, [onRegisterGenerate, handleGenerateScene]);

    useEffect(() => {
        onRegisterGenerateWithPrompt?.(handleGenerateSceneWithPrompt);
    }, [onRegisterGenerateWithPrompt, handleGenerateSceneWithPrompt]);
```

- [ ] **Step 4: Add the JSX — Connection Status section**

Replace the placeholder return with the full JSX. Start with the Connection Status accordion section:

```tsx
    return (
        <Stack h="100%" gap={0}>
            <Text
                size="sm"
                fw={600}
                p="xs"
                c="var(--theme-text-primary)"
                style={{ borderBottom: '1px solid var(--theme-gray-5)' }}
            >
                Controls
            </Text>

            <Stack flex={1} p="xs" gap="xs" style={{ overflow: 'auto' }}>
                <Accordion
                    variant="separated"
                    radius="sm"
                    multiple
                    value={openSections}
                    onChange={setOpenSections}
                >
                    {/* ── Connection Status ─────────────────── */}
                    <Accordion.Item value="connection">
                        <Accordion.Control>
                            <Group gap="xs">
                                {connectionStatus === 'connected' ? (
                                    <IconCircleCheck size={14} color="var(--mantine-color-green-6)" />
                                ) : (
                                    <IconCircleX size={14} color="var(--mantine-color-red-6)" />
                                )}
                                <Text size="xs" fw={600}>Connection Status</Text>
                                {connectionStatus === 'connected' && !openSections.includes('connection') && (
                                    <Text size="xs" c="dimmed" truncate style={{ maxWidth: 180 }}>
                                        LM Studio: {selectedModelId || 'connected'} | SwarmUI: Ready
                                    </Text>
                                )}
                            </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="sm">
                                {/* LM Studio */}
                                <ElevatedCard elevation="table" tone="neutral">
                                    <Stack gap="xs">
                                        <Group gap="xs">
                                            <div style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                backgroundColor: connectionStatus === 'connected'
                                                    ? 'var(--mantine-color-green-6)'
                                                    : 'var(--mantine-color-red-6)',
                                            }} />
                                            <Text size="xs" fw={600}>LM Studio</Text>
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
                                                API: {detectedServerMode}
                                            </Text>
                                        )}
                                        {selectedModelId && (
                                            <Text size="xs" c="dimmed">
                                                Model: {selectedModelId}
                                            </Text>
                                        )}
                                        {connectionMessage && (
                                            <Text size="xs" c="dimmed">{connectionMessage}</Text>
                                        )}
                                        <SwarmButton
                                            size="xs"
                                            tone="brand"
                                            emphasis="solid"
                                            leftSection={<IconPlugConnected size={14} />}
                                            onClick={onProbeConnection}
                                            loading={connectionStatus === 'connecting'}
                                        >
                                            Test Connection
                                        </SwarmButton>
                                    </Stack>
                                </ElevatedCard>

                                {/* SwarmUI */}
                                <ElevatedCard elevation="table" tone="neutral">
                                    <Stack gap="xs">
                                        <Group gap="xs">
                                            <div style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                backgroundColor: 'var(--mantine-color-green-6)',
                                            }} />
                                            <Text size="xs" fw={600}>SwarmUI</Text>
                                            <Text size="xs" c="dimmed">Ready</Text>
                                        </Group>
                                        <Text size="xs" c="dimmed" truncate>
                                            {swarmBaseUrl}
                                        </Text>
                                    </Stack>
                                </ElevatedCard>
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>

                    {/* Sections for LLM and Image will be added next */}
                </Accordion>
            </Stack>
        </Stack>
    );
```

- [ ] **Step 5: Add the JSX — LLM Parameters section**

Add inside the Accordion, after the connection section:

```tsx
                    {/* ── LLM Parameters ───────────────────── */}
                    <Accordion.Item value="llm">
                        <Accordion.Control>
                            <Text size="xs" fw={600}>LLM Parameters</Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="md">
                                <Select
                                    label="Model"
                                    size="xs"
                                    value={selectedModelId || null}
                                    onChange={(v) => v && setSelectedModelId(v)}
                                    data={availableModels.map((m) => ({
                                        value: m.id,
                                        label: m.name,
                                    }))}
                                    placeholder="Select model..."
                                    disabled={availableModels.length === 0}
                                    nothingFoundMessage="Connect to LM Studio first"
                                />
                                <div>
                                    <Text size="xs" fw={500} mb={4}>
                                        Temperature: {chatTemperature.toFixed(1)}
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
```

- [ ] **Step 6: Add the JSX — Image Generation section**

Add inside the Accordion, after the LLM section:

```tsx
                    {/* ── Image Generation ──────────────────── */}
                    <Accordion.Item value="image">
                        <Accordion.Control>
                            <Text size="xs" fw={600}>Image Generation</Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="md">
                                {/* Image model selector */}
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
                                                ? 'From generate page'
                                                : 'Select model...'}
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
                                        <Progress value={modelLoadProgress * 100} size="xs" mt={6} animated />
                                    )}
                                </div>

                                {/* Aspect ratio */}
                                <Select
                                    label="Aspect"
                                    size="xs"
                                    value={`${imageWidth}x${imageHeight}`}
                                    onChange={(v) => {
                                        if (!v) return;
                                        const [w, h] = v.split('x').map(Number);
                                        setImageDimensions(w, h);
                                    }}
                                    data={[
                                        { value: '768x512', label: 'Landscape (768x512)' },
                                        { value: '512x768', label: 'Portrait (512x768)' },
                                        { value: '512x512', label: 'Square (512x512)' },
                                        { value: '1024x768', label: 'Wide (1024x768)' },
                                    ]}
                                />

                                {/* Steps */}
                                <div>
                                    <Text size="xs" fw={500} mb={4}>Steps: {imageSteps}</Text>
                                    <Slider
                                        min={1} max={150} step={1}
                                        value={imageSteps} onChange={setImageSteps}
                                        marks={STEPS_MARKS} size="xs" label={null}
                                    />
                                </div>

                                {/* CFG Scale */}
                                <div>
                                    <Text size="xs" fw={500} mb={4}>CFG Scale: {imageCfgScale}</Text>
                                    <Slider
                                        min={1} max={30} step={0.5}
                                        value={imageCfgScale} onChange={setImageCfgScale}
                                        marks={CFG_MARKS} size="xs" label={null}
                                    />
                                </div>

                                {/* CLIP Stop at Layer */}
                                <div>
                                    <Checkbox
                                        label={<Text size="xs" fw={500}>Override CLIP stop-at-layer</Text>}
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
                                                min={-24} max={-1} step={1}
                                                value={imageClipStopAtLayer ?? -1}
                                                onChange={(v) => setImageClipStopAtLayer(v)}
                                                size="xs" label={null}
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
```

- [ ] **Step 7: Verify TypeScript compiles (ControlsPanel in isolation)**

Run: `cd "C:/Users/Phala/SwarmUI/swarmui-react" && npx tsc -b --noEmit`

Expected: ScenePanel errors still present (expected — not yet deleted). ControlsPanel should compile cleanly.

- [ ] **Step 8: Commit**

```bash
git add src/pages/RoleplayPage/ControlsPanel.tsx
git commit -m "feat: create ControlsPanel with connection status, LLM params, and image gen"
```

---

## Chunk 3: Modify Existing Components

### Task 4: Update CharacterSidebar — remove connection UI, add active character profile

**Files:**
- Modify: `src/pages/RoleplayPage/CharacterSidebar.tsx`

- [ ] **Step 1: Remove the onProbeConnection prop**

Change the interface and function signature:

```typescript
// DELETE the interface entirely:
// interface CharacterSidebarProps {
//     onProbeConnection: () => void;
// }

// Change function signature from:
export function CharacterSidebar({ onProbeConnection }: CharacterSidebarProps) {
// To:
export function CharacterSidebar() {
```

- [ ] **Step 2: Remove connection-related state, store bindings, and imports**

Remove `connectionPopoverOpen` state:
```typescript
// DELETE:
const [connectionPopoverOpen, setConnectionPopoverOpen] = useState(false);
```

Remove connection-related store bindings from the `useShallow` selector — remove `connectionStatus`, `connectionMessage`, `lmStudioEndpoint`, `setLmStudioEndpoint`, `selectedModelId`, `setSelectedModelId`, `availableModels`.

Keep: `characters`, `activeCharacterId`, `setActiveCharacter`, `removeCharacter`, `getActiveCharacter` (add this one — needed for the profile).

Remove the `statusTone` computation and the unused imports: `Popover`, `Select`, `TextInput`, `IconPlugConnected`, `IconSettings`, `SwarmBadge`.

- [ ] **Step 3: Remove connection popover from JSX**

In the header `<Group>`, remove the entire `<Popover>` block (lines 96-155 of current file). Keep only the "New character" `<ActionIcon>`.

Remove the connection status footer (the `<Group>` with `<SwarmBadge>` at the bottom of the component, lines 237-241).

- [ ] **Step 4: Add active character profile section**

Add `getActiveCharacter` to the store selector. After the header `<Group>`, before the `<ScrollArea>`, add:

```tsx
            {/* Active Character Profile */}
            {(() => {
                const activeChar = getActiveCharacter();
                if (!activeChar) return null;
                return (
                    <Stack align="center" gap="xs" p="md" style={{ borderBottom: '1px solid var(--theme-gray-5)' }}>
                        <CharacterAvatar character={activeChar} size={120} />
                        <Text size="md" fw={700} ta="center">
                            {activeChar.name}
                        </Text>
                        <Text size="xs" c="dimmed" ta="center" lineClamp={3}>
                            {activeChar.personality}
                        </Text>
                        <SwarmButton
                            tone="brand"
                            emphasis="ghost"
                            size="xs"
                            leftSection={<IconEdit size={12} />}
                            onClick={() => handleEditCharacter(activeChar)}
                        >
                            Edit Character
                        </SwarmButton>
                    </Stack>
                );
            })()}
```

- [ ] **Step 5: Update character list avatar size to 28px**

In the character list card rendering, change the avatar size:

```typescript
// FROM:
<CharacterAvatar character={character} size={32} />
// TO:
<CharacterAvatar character={character} size={28} />
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd "C:/Users/Phala/SwarmUI/swarmui-react" && npx tsc -b --noEmit`

Expected: Errors in `index.tsx` (still passes `onProbeConnection` to CharacterSidebar) — expected, will fix in Task 6.

- [ ] **Step 7: Commit**

```bash
git add src/pages/RoleplayPage/CharacterSidebar.tsx
git commit -m "feat(sidebar): add active character profile, remove connection UI"
```

---

### Task 5: Update ChatPanel — Enter-to-send, darker background, pass temperature/maxTokens

**Files:**
- Modify: `src/pages/RoleplayPage/ChatPanel.tsx`

- [ ] **Step 1: Change Enter-to-send behavior**

Replace the `handleKeyDown` function:

```typescript
// FROM:
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
    }
};

// TO:
const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
};
```

- [ ] **Step 2: Update placeholder text**

Change the Textarea placeholder:

```typescript
// FROM:
placeholder={`Message ${activeCharacter.name}... (Ctrl+Enter to send)`}
// TO:
placeholder={`Message ${activeCharacter.name}... (Shift+Enter for new line)`}
```

- [ ] **Step 3: Add darker background to messages area**

On the `<ScrollArea>` component, add a background style:

```typescript
// FROM:
<ScrollArea flex={1} p="xs" viewportRef={viewportRef}>
// TO:
<ScrollArea
    flex={1}
    p="xs"
    viewportRef={viewportRef}
    style={{ backgroundColor: 'var(--elevation-floor)' }}
>
```

- [ ] **Step 4: Add chatTemperature and chatMaxTokens to store bindings and pass to streamRoleplayChat**

Add `chatTemperature` and `chatMaxTokens` to the `useShallow` selector in the component.

In the `streamRoleplayChat` call, add the new fields:

```typescript
await streamRoleplayChat({
    endpointUrl: lmStudioEndpoint,
    serverMode: detectedServerMode,
    modelId: selectedModelId,
    messages: apiMessages,
    temperature: chatTemperature,
    maxTokens: chatMaxTokens,
    // ... rest of callbacks unchanged
```

Add `chatTemperature` and `chatMaxTokens` to the `useCallback` dependency array for `handleSend`.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd "C:/Users/Phala/SwarmUI/swarmui-react" && npx tsc -b --noEmit`

Expected: Errors in index.tsx and ScenePanel still present (expected).

- [ ] **Step 6: Commit**

```bash
git add src/pages/RoleplayPage/ChatPanel.tsx
git commit -m "feat(chat): Enter-to-send, darker background, pass temperature/maxTokens"
```

---

### Task 6: Update index.tsx — swap ScenePanel for ControlsPanel

**Files:**
- Modify: `src/pages/RoleplayPage/index.tsx`

- [ ] **Step 1: Update imports**

```typescript
// FROM:
import { ScenePanel } from './ScenePanel';
// TO:
import { ControlsPanel } from './ControlsPanel';
```

- [ ] **Step 2: Remove connection badge from header**

Remove the `connectionBadge` computation (lines 86-91) and the `badges` prop from `<SectionHero>`:

```typescript
// REMOVE badges prop entirely:
badges={[
    {
        label: connectionBadge.label,
        tone: connectionBadge.tone,
        emphasis: 'solid',
    },
]}
```

- [ ] **Step 3: Rename toggle button**

```typescript
// FROM:
{scenePanelOpen ? 'Hide Scene' : 'Show Scene'}
// TO:
{scenePanelOpen ? 'Hide Controls' : 'Show Controls'}
```

- [ ] **Step 4: Remove onProbeConnection from CharacterSidebar**

```typescript
// FROM:
<CharacterSidebar onProbeConnection={probeConnection} />
// TO:
<CharacterSidebar />
```

- [ ] **Step 5: Replace ScenePanel with ControlsPanel**

```typescript
// FROM:
<ScenePanel
    onRegisterGenerate={(fn) => { generateSceneRef.current = fn; }}
    onRegisterGenerateWithPrompt={(fn) => { generateSceneWithPromptRef.current = fn; }}
/>
// TO:
<ControlsPanel
    onProbeConnection={probeConnection}
    onRegisterGenerate={(fn) => { generateSceneRef.current = fn; }}
    onRegisterGenerateWithPrompt={(fn) => { generateSceneWithPromptRef.current = fn; }}
/>
```

- [ ] **Step 6: Clean up unused store bindings**

The `connectionStatus` binding is no longer needed in `index.tsx` since the badge is removed. Remove it from the `useShallow` selector, along with `connectionBadge` variable.

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd "C:/Users/Phala/SwarmUI/swarmui-react" && npx tsc -b --noEmit`

Expected: Only ScenePanel.tsx errors remain (it references deleted store fields). All other files should compile.

- [ ] **Step 8: Commit**

```bash
git add src/pages/RoleplayPage/index.tsx
git commit -m "feat(page): swap ScenePanel for ControlsPanel, update header"
```

---

### Task 7: Delete ScenePanel and verify full build

**Files:**
- Delete: `src/pages/RoleplayPage/ScenePanel.tsx`

- [ ] **Step 1: Delete ScenePanel.tsx**

```bash
rm src/pages/RoleplayPage/ScenePanel.tsx
```

- [ ] **Step 2: Verify TypeScript compiles with zero errors**

Run: `cd "C:/Users/Phala/SwarmUI/swarmui-react" && npx tsc -b --noEmit; echo "EXIT: $?"`

Expected: EXIT: 0 (no errors)

- [ ] **Step 3: Verify Vite build succeeds**

Run: `cd "C:/Users/Phala/SwarmUI/swarmui-react" && npx vite build`

Expected: Build completes successfully with no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: delete ScenePanel.tsx, complete UI overhaul

Replaced ScenePanel with ControlsPanel showing connection status,
LLM parameters, and image generation controls. Enriched Character
sidebar with active character profile. Chat panel now uses Enter
to send with darker message area background."
```
