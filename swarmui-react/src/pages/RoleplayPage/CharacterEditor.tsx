import { useMemo, useState } from 'react';
import {
    ActionIcon,
    Checkbox,
    Divider,
    FileButton,
    Grid,
    Group,
    Loader,
    Modal,
    NumberInput,
    Progress,
    ScrollArea,
    Select,
    Slider,
    Stack,
    Text,
    TextInput,
    Textarea,
    Tooltip,
} from '@mantine/core';
import {
    IconCheck,
    IconDownload,
    IconPhoto,
    IconRefresh,
    IconSparkles,
    IconTrash,
    IconUpload,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useShallow } from 'zustand/react/shallow';
import { SwarmButton } from '../../components/ui/SwarmButton';
import { useRoleplayStore } from '../../stores/roleplayStore';
import { useGenerationStore } from '../../store/generationStore';
import { useModelLoading } from '../../hooks/useModelLoading';
import { swarmClient } from '../../api/client';
import { resolveAssetUrl } from '../../config/runtimeEndpoints';
import type { RoleplayCharacter } from '../../types/roleplay';
import { PRESET_PROMPT_MAP, ROLEPLAY_PROMPT_PRESETS } from '../../data/roleplayPromptPresets';
import { PERSONALITY_PRESET_MAP, PERSONALITY_PRESETS } from '../../data/personalityPresets';
import { CharacterAvatar } from './CharacterAvatar';

const IP_ADAPTER_MODELS = [
    { value: 'faceid plus v2', label: 'FaceID Plus v2 — recommended (SDXL / SD1.5)' },
    { value: 'faceid', label: 'FaceID Standard (SD1.5)' },
    { value: 'faceid portrait', label: 'FaceID Portrait — stronger identity' },
    { value: 'faceid portrait unnorm', label: 'FaceID Portrait UnNorm (SDXL only)' },
];

interface CharacterEditorProps {
    opened: boolean;
    onClose: () => void;
    character: RoleplayCharacter | null;
}

/** Convert a SwarmUI output URL to a base64 data URL so it persists in localStorage
 *  and is accepted by IP-Adapter FaceID as a promptimage. */
async function fetchAsDataUrl(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function CharacterEditorForm({
    character,
    onClose,
}: {
    character: RoleplayCharacter | null;
    onClose: () => void;
}) {
    const isEditing = character !== null;

    // ── Character text fields ─────────────────────────────────────────────
    const [name, setName] = useState(character?.name ?? '');
    const [personality, setPersonality] = useState(character?.personality ?? '');
    const [systemPrompt, setSystemPrompt] = useState(
        character?.systemPrompt ?? PRESET_PROMPT_MAP.get('default-roleplay') ?? ''
    );
    const [sceneSuggestionPrompt, setSceneSuggestionPrompt] = useState(
        character?.sceneSuggestionPrompt ?? ''
    );

    // ── Visual identity fields ────────────────────────────────────────────
    const [appearancePrompt, setAppearancePrompt] = useState(character?.appearancePrompt ?? '');
    const [characterLora, setCharacterLora] = useState(character?.characterLora ?? '');
    const [characterLoraWeight, setCharacterLoraWeight] = useState<number>(
        character?.characterLoraWeight ?? 0.8
    );
    const [ipAdapterEnabled, setIpAdapterEnabled] = useState(character?.ipAdapterEnabled ?? false);
    const [ipAdapterModel, setIpAdapterModel] = useState(
        character?.ipAdapterModel ?? 'faceid plus v2'
    );
    const [ipAdapterWeight, setIpAdapterWeight] = useState<number>(
        character?.ipAdapterWeight ?? 1.0
    );

    // ── Portrait history (local session only — not persisted) ─────────────
    // Index 0 is always the "selected" portrait; clicking a thumbnail swaps it to front
    const [portraitCandidates, setPortraitCandidates] = useState<string[]>(
        character?.avatar ? [character.avatar] : []
    );
    const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);

    const currentPortrait = portraitCandidates[0] ?? null;
    const hasPortrait = !!currentPortrait;

    const selectPortrait = (index: number) => {
        if (index === 0) return;
        setPortraitCandidates((prev) => {
            const next = [...prev];
            const [picked] = next.splice(index, 1);
            return [picked, ...next];
        });
    };

    const removeCurrentPortrait = () => {
        setPortraitCandidates((prev) => prev.slice(1));
        setIpAdapterEnabled(false);
        if (isEditing) {
            updateCharacterAvatar(character.id, '');
        }
    };

    // ── Store ─────────────────────────────────────────────────────────────
    const {
        addCharacter,
        updateCharacter,
        setActiveCharacter,
        updateCharacterAvatar,
        imageSteps,
        imageCfgScale,
        imageModelId,
    } = useRoleplayStore(
        useShallow((s) => ({
            addCharacter: s.addCharacter,
            updateCharacter: s.updateCharacter,
            setActiveCharacter: s.setActiveCharacter,
            updateCharacterAvatar: s.updateCharacterAvatar,
            imageSteps: s.imageSteps,
            imageCfgScale: s.imageCfgScale,
            imageModelId: s.imageModelId,
        }))
    );

    // ── Model selection ───────────────────────────────────────────────────
    const generatePageModel = useGenerationStore((s) => s.selectedModel);
    const effectiveModel = imageModelId || generatePageModel;
    const { isLoading: isLoadingModel, progress: modelLoadProgress, loadModel } = useModelLoading();

    // ── Avatar preview object (for CharacterAvatar component) ─────────────
    const avatarPreview: RoleplayCharacter = useMemo(
        () => ({
            id: character?.id ?? 'preview',
            name: name || '?',
            avatar: currentPortrait,
            appearancePrompt: appearancePrompt.trim() || null,
            characterLora: characterLora.trim() || null,
            characterLoraWeight,
            ipAdapterEnabled,
            ipAdapterModel,
            ipAdapterWeight,
            personality,
            systemPrompt,
            sceneSuggestionPrompt: sceneSuggestionPrompt.trim() || null,
            createdAt: character?.createdAt ?? 0,
            updatedAt: character?.updatedAt ?? 0,
        }),
        [character, name, currentPortrait, appearancePrompt, characterLora, characterLoraWeight,
            ipAdapterEnabled, ipAdapterModel, ipAdapterWeight, personality, systemPrompt, sceneSuggestionPrompt]
    );

    // ── Save ─────────────────────────────────────────────────────────────
    const handleSave = () => {
        if (!name.trim()) return;
        const sharedFields = {
            name: name.trim(),
            personality: personality.trim(),
            systemPrompt: systemPrompt.trim(),
            sceneSuggestionPrompt: sceneSuggestionPrompt.trim() || null,
            appearancePrompt: appearancePrompt.trim() || null,
            characterLora: characterLora.trim() || null,
            characterLoraWeight,
            ipAdapterEnabled,
            ipAdapterModel,
            ipAdapterWeight,
        };

        if (isEditing) {
            updateCharacter(character.id, sharedFields);
        } else {
            const newCharacter: RoleplayCharacter = {
                id: crypto.randomUUID(),
                avatar: currentPortrait,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                ...sharedFields,
            };
            addCharacter(newCharacter);
            setActiveCharacter(newCharacter.id);
        }
        onClose();
    };

    // ── Portrait generation ───────────────────────────────────────────────
    const handleGeneratePortrait = () => {
        if (!appearancePrompt.trim()) return;
        setIsGeneratingPortrait(true);

        const prompt = `${appearancePrompt.trim()}, portrait, character art, detailed face, front facing, solo`;

        swarmClient.generateImage(
            {
                prompt,
                ...(effectiveModel ? { model: effectiveModel } : {}),
                width: 512,
                height: 512,
                images: 1,
                steps: imageSteps,
                cfgscale: imageCfgScale,
                ...(characterLora.trim()
                    ? { loras: characterLora.trim(), loraweights: String(characterLoraWeight) }
                    : {}),
            },
            {
                onImage: (data: { image?: string }) => {
                    const imageUrl = resolveAssetUrl(
                        data.image?.startsWith('/') ? data.image : `/${data.image}`
                    );
                    // Convert to base64 so it persists in localStorage and works with IP-Adapter
                    fetchAsDataUrl(imageUrl)
                        .then((dataUrl) => {
                            setPortraitCandidates((prev) => [dataUrl, ...prev]);
                            if (isEditing) {
                                updateCharacterAvatar(character.id, dataUrl);
                            }
                        })
                        .catch(() => {
                            // Fallback to URL if conversion fails (e.g. CORS)
                            setPortraitCandidates((prev) => [imageUrl, ...prev]);
                            if (isEditing) {
                                updateCharacterAvatar(character.id, imageUrl);
                            }
                        });
                },
                onComplete: () => setIsGeneratingPortrait(false),
                onError: () => {
                    notifications.show({
                        title: 'Portrait Generation Failed',
                        message: 'SwarmUI could not generate the portrait.',
                        color: 'red',
                    });
                    setIsGeneratingPortrait(false);
                },
                onDataError: (errorMessage: string) => {
                    notifications.show({
                        title: 'Portrait Generation Error',
                        message: errorMessage,
                        color: 'red',
                    });
                    setIsGeneratingPortrait(false);
                },
            }
        );
    };

    // ── File upload ──────────────────────────────────────────────────────
    const handleFileUpload = (file: File | null) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            if (dataUrl) {
                setPortraitCandidates((prev) => [dataUrl, ...prev]);
                if (isEditing) {
                    updateCharacterAvatar(character.id, dataUrl);
                }
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <Grid gutter="lg" align="flex-start">
            {/* ── LEFT COLUMN: Visual Identity ───────────────────────────── */}
            <Grid.Col span={5}>
                <Stack gap="sm">
                    {/* Portrait display */}
                    <div
                        style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: 'calc(10px * var(--theme-radius-multiplier))',
                            overflow: 'hidden',
                            backgroundColor: 'var(--elevation-floor)',
                            border: '1px solid var(--theme-gray-5)',
                        }}
                    >
                        {currentPortrait ? (
                            <img
                                src={currentPortrait}
                                alt="Character portrait"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <CharacterAvatar character={avatarPreview} size={64} />
                                <Text size="xs" c="dimmed">No portrait yet</Text>
                            </div>
                        )}

                        {/* Generating overlay */}
                        {isGeneratingPortrait && (
                            <div style={{
                                position: 'absolute', inset: 0,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                                backgroundColor: 'rgba(0,0,0,0.6)',
                            }}>
                                <Loader size="lg" color="white" />
                                <Text size="xs" c="white" fw={500}>Generating...</Text>
                            </div>
                        )}

                        {/* Remove button */}
                        {hasPortrait && !isGeneratingPortrait && (
                            <Tooltip label="Remove portrait">
                                <ActionIcon
                                    variant="filled"
                                    color="dark"
                                    size="sm"
                                    style={{ position: 'absolute', top: 6, right: 6, opacity: 0.85 }}
                                    onClick={removeCurrentPortrait}
                                >
                                    <IconTrash size={12} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </div>

                    {/* Portrait history thumbnails */}
                    {portraitCandidates.length > 1 && (
                        <ScrollArea scrollbarSize={4}>
                            <Group gap={6} wrap="nowrap" pb={4}>
                                {portraitCandidates.map((url, i) => (
                                    <Tooltip key={i} label={i === 0 ? 'Current portrait' : `Select portrait ${i + 1}`}>
                                        <div
                                            onClick={() => selectPortrait(i)}
                                            style={{
                                                position: 'relative',
                                                width: 52,
                                                height: 52,
                                                flexShrink: 0,
                                                borderRadius: 'calc(6px * var(--theme-radius-multiplier))',
                                                overflow: 'hidden',
                                                cursor: i === 0 ? 'default' : 'pointer',
                                                border: i === 0
                                                    ? '2px solid var(--theme-brand)'
                                                    : '2px solid var(--theme-gray-5)',
                                            }}
                                        >
                                            <img src={url} alt={`Portrait ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                            {i === 0 && (
                                                <div style={{
                                                    position: 'absolute', bottom: 2, right: 2,
                                                    backgroundColor: 'var(--theme-brand)',
                                                    borderRadius: '50%', width: 14, height: 14,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    <IconCheck size={9} color="white" />
                                                </div>
                                            )}
                                        </div>
                                    </Tooltip>
                                ))}
                            </Group>
                        </ScrollArea>
                    )}

                    {/* Model status + Load button */}
                    <Group gap="xs" align="center">
                        <Text size="xs" c="dimmed" style={{ flex: 1 }} truncate>
                            {effectiveModel
                                ? effectiveModel.split('/').pop()
                                : 'No model — set on Generate page'}
                        </Text>
                        <Tooltip label={effectiveModel
                            ? `Load "${effectiveModel.split('/').pop()}" into SwarmUI`
                            : 'Select a model on the Generate page first'}>
                            <ActionIcon
                                variant="default"
                                size="sm"
                                onClick={() => effectiveModel && loadModel(effectiveModel)}
                                loading={isLoadingModel}
                                disabled={!effectiveModel || isLoadingModel}
                            >
                                <IconDownload size={13} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                    {isLoadingModel && (
                        <Progress value={modelLoadProgress * 100} size="xs" animated />
                    )}

                    {/* Portrait action buttons */}
                    <Group gap="xs">
                        <SwarmButton
                            tone="brand"
                            emphasis="soft"
                            size="xs"
                            style={{ flex: 1 }}
                            leftSection={hasPortrait ? <IconRefresh size={13} /> : <IconSparkles size={13} />}
                            onClick={handleGeneratePortrait}
                            loading={isGeneratingPortrait}
                            disabled={!appearancePrompt.trim() || isGeneratingPortrait}
                        >
                            {hasPortrait ? 'Regenerate' : 'Generate Portrait'}
                        </SwarmButton>
                        <FileButton onChange={handleFileUpload} accept="image/*">
                            {(props) => (
                                <Tooltip label="Upload your own portrait image">
                                    <ActionIcon
                                        {...props}
                                        variant="default"
                                        size="md"
                                    >
                                        <IconUpload size={14} />
                                    </ActionIcon>
                                </Tooltip>
                            )}
                        </FileButton>
                        {hasPortrait && (
                            <Tooltip label="View full size">
                                <ActionIcon
                                    variant="default"
                                    size="md"
                                    component="a"
                                    href={currentPortrait!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <IconPhoto size={14} />
                                </ActionIcon>
                            </Tooltip>
                        )}
                    </Group>

                    {/* Appearance description */}
                    <Textarea
                        label="Appearance Description"
                        description="Used for portrait generation and prepended to every scene image"
                        placeholder="silver hair, violet eyes, leather armor, anime style, detailed illustration"
                        value={appearancePrompt}
                        onChange={(e) => setAppearancePrompt(e.currentTarget.value)}
                        minRows={3}
                        maxRows={5}
                        autosize
                        size="sm"
                    />

                    {/* ── Image Consistency ─────────────────────────────── */}
                    <Divider label="Image Consistency" labelPosition="center" mt={4} />

                    {/* LoRA */}
                    <Group gap="xs" align="flex-end">
                        <TextInput
                            style={{ flex: 1 }}
                            label="Character LoRA"
                            description="Trained LoRA for appearance consistency"
                            placeholder="character_v1.safetensors"
                            value={characterLora}
                            onChange={(e) => setCharacterLora(e.currentTarget.value)}
                            size="xs"
                        />
                        <NumberInput
                            style={{ width: 72 }}
                            label="Weight"
                            min={0}
                            max={2}
                            step={0.05}
                            decimalScale={2}
                            value={characterLoraWeight}
                            onChange={(v) => setCharacterLoraWeight(typeof v === 'number' ? v : 0.8)}
                            size="xs"
                        />
                    </Group>

                    {/* IP-Adapter FaceID */}
                    <Tooltip
                        label="Requires: ComfyUI-IPAdapter-plus node pack + ip-adapter-faceid-plusv2_sdxl model. The character portrait is used as the face identity reference — no LoRA training needed."
                        multiline
                        w={260}
                        withArrow
                        position="top-start"
                    >
                        <Checkbox
                            label="Use IP-Adapter FaceID"
                            description="Zero-LoRA face embedding — generate portrait first"
                            checked={ipAdapterEnabled}
                            onChange={(e) => setIpAdapterEnabled(e.currentTarget.checked)}
                            disabled={!hasPortrait}
                            size="xs"
                        />
                    </Tooltip>

                    {ipAdapterEnabled && (
                        <Stack gap="xs">
                            <Select
                                label="FaceID Model"
                                size="xs"
                                value={ipAdapterModel}
                                onChange={(v) => v && setIpAdapterModel(v)}
                                data={IP_ADAPTER_MODELS}
                            />
                            <div>
                                <Text size="xs" fw={500} mb={6}>
                                    Face Weight: {ipAdapterWeight.toFixed(2)}
                                </Text>
                                <Slider
                                    min={0.5}
                                    max={1.5}
                                    step={0.05}
                                    value={ipAdapterWeight}
                                    onChange={setIpAdapterWeight}
                                    marks={[{ value: 1.0, label: '1.0' }]}
                                    size="xs"
                                    label={null}
                                    mb={8}
                                />
                                <Text size="xs" c="dimmed">
                                    Lower = more scene freedom · Higher = stricter face match
                                </Text>
                            </div>
                        </Stack>
                    )}
                </Stack>
            </Grid.Col>

            {/* ── RIGHT COLUMN: Character Definition ─────────────────────── */}
            <Grid.Col span={7}>
                <Stack gap="sm" h="100%">
                    <TextInput
                        label="Name"
                        placeholder="Character name"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        required
                    />
                    <Stack gap={4}>
                        <Group justify="space-between" align="center">
                            <Text size="sm" fw={500}>Personality</Text>
                            <Select
                                placeholder="Load preset..."
                                size="xs"
                                w={180}
                                searchable
                                clearable={false}
                                value={null}
                                data={PERSONALITY_PRESETS.map((g) => ({
                                    group: g.group,
                                    items: g.items.map((p) => ({ value: p.value, label: p.label })),
                                }))}
                                onChange={(value) => {
                                    if (!value) return;
                                    const preset = PERSONALITY_PRESET_MAP.get(value);
                                    if (preset) setPersonality(preset);
                                }}
                            />
                        </Group>
                        <Textarea
                            description="How the character acts, speaks, and behaves — injected into the system prompt so the AI plays them accurately"
                            placeholder="A mysterious wanderer who speaks in riddles and knows too much..."
                            value={personality}
                            onChange={(e) => setPersonality(e.currentTarget.value)}
                            minRows={3}
                            maxRows={6}
                            autosize
                        />
                    </Stack>
                    <Stack gap={4}>
                        <Group justify="space-between" align="center">
                            <Text size="sm" fw={500}>
                                System Prompt{' '}
                                <Text span c="red">*</Text>
                            </Text>
                            <Select
                                placeholder="Load preset..."
                                size="xs"
                                w={180}
                                searchable
                                clearable={false}
                                value={null}
                                data={ROLEPLAY_PROMPT_PRESETS.map((g) => ({
                                    group: g.group,
                                    items: g.items.map((p) => ({ value: p.value, label: p.label })),
                                }))}
                                onChange={(value) => {
                                    if (!value) return;
                                    const prompt = PRESET_PROMPT_MAP.get(value);
                                    if (prompt) setSystemPrompt(prompt);
                                }}
                            />
                        </Group>
                        <Textarea
                            description="Full instructions sent to the AI at the start of every conversation"
                            placeholder="You are a creative storyteller..."
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.currentTarget.value)}
                            minRows={7}
                            maxRows={14}
                            autosize
                            required
                            styles={{ input: { fontFamily: 'monospace', fontSize: 12 } }}
                        />
                    </Stack>
                    <Textarea
                        label="Scene Suggestion Prompt"
                        description="Optional — how the AI is asked to describe the current scene for image generation"
                        placeholder="Describe the current visual scene in a single vivid sentence suitable as an image prompt..."
                        value={sceneSuggestionPrompt}
                        onChange={(e) => setSceneSuggestionPrompt(e.currentTarget.value)}
                        minRows={2}
                        maxRows={5}
                        autosize
                    />

                    <div style={{ flex: 1 }} />

                    <Divider />
                    <Group justify="flex-end" gap="xs">
                        <SwarmButton
                            tone="secondary"
                            emphasis="ghost"
                            onClick={onClose}
                        >
                            Cancel
                        </SwarmButton>
                        <SwarmButton
                            tone="brand"
                            emphasis="solid"
                            onClick={handleSave}
                            disabled={!name.trim()}
                        >
                            {isEditing ? 'Save Changes' : 'Create Character'}
                        </SwarmButton>
                    </Group>
                </Stack>
            </Grid.Col>
        </Grid>
    );
}

export function CharacterEditor({ opened, onClose, character }: CharacterEditorProps) {
    const formKey = useMemo(
        () => (character?.id ?? 'new') + '-' + (opened ? '1' : '0'),
        [character?.id, opened]
    );

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <CharacterAvatar character={character} size={24} />
                    <span>{character ? `Edit — ${character.name}` : 'New Character'}</span>
                </Group>
            }
            size="xl"
            scrollAreaComponent={ScrollArea.Autosize}
        >
            {opened && (
                <CharacterEditorForm
                    key={formKey}
                    character={character}
                    onClose={onClose}
                />
            )}
        </Modal>
    );
}
