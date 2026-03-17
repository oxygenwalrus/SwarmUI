import { useState } from 'react';
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Divider,
    Drawer,
    Group,
    Loader,
    Paper,
    ScrollArea,
    Stack,
    Text,
    Textarea,
    Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconArrowUp,
    IconBrain,
    IconBulb,
    IconCopy,
    IconMessageCircle,
    IconRefresh,
    IconSettings,
    IconTrash,
    IconWriting,
} from '@tabler/icons-react';
import { chatWithAssistant, probeAssistantConnection } from '../services/magicPromptService';
import { useAssistantStore } from '../stores/assistantStore';
import { usePromptEnhanceStore } from '../stores/promptEnhanceStore';
import type { AssistantApplyPatch, AssistantChatTurn, AssistantResponseDraft } from '../types/assistant';

interface AssistantWorkspaceContext {
    prompt: string;
    negativePrompt: string;
    model: string;
    activeLoras: string[];
    activeEmbeddings: string[];
    activeWildcards: string[];
    featureFlags: string[];
}

interface GenerateAssistantPanelProps {
    opened: boolean;
    onClose: () => void;
    context: AssistantWorkspaceContext;
    onApplyPatch: (patch: AssistantApplyPatch) => void;
    onApplyAndGenerate: (patch: AssistantApplyPatch) => void;
}

function createTurn(role: AssistantChatTurn['role'], content: string, draft?: AssistantResponseDraft | null): AssistantChatTurn {
    return {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
        createdAt: Date.now(),
        draft: draft ?? null,
    };
}

function buildContextBlock(context: AssistantWorkspaceContext): string {
    return [
        'Current workspace context:',
        `Prompt: ${context.prompt || '(empty)'}`,
        `Negative prompt: ${context.negativePrompt || '(empty)'}`,
        `Model: ${context.model || '(not selected)'}`,
        `Active LoRAs: ${context.activeLoras.length > 0 ? context.activeLoras.join(', ') : '(none)'}`,
        `Active embeddings: ${context.activeEmbeddings.length > 0 ? context.activeEmbeddings.join(', ') : '(none)'}`,
        `Active wildcards: ${context.activeWildcards.length > 0 ? context.activeWildcards.join(', ') : '(none)'}`,
        `Enabled features: ${context.featureFlags.length > 0 ? context.featureFlags.join(', ') : '(none)'}`,
    ].join('\n');
}

function draftToParameterPatch(draft?: AssistantResponseDraft | null): AssistantApplyPatch {
    const parameters = (draft?.parameterSuggestions || []).reduce<NonNullable<AssistantApplyPatch['parameters']>>((acc, item) => {
        acc[item.key] = item.value;
        return acc;
    }, {});

    return {
        parameters,
    };
}

function turnBubbleTone(role: AssistantChatTurn['role']) {
    if (role === 'assistant') {
        return {
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.35)',
        };
    }

    return {
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
    };
}

export function GenerateAssistantPanel({
    opened,
    onClose,
    context,
    onApplyPatch,
    onApplyAndGenerate,
}: GenerateAssistantPanelProps) {
    const endpointUrl = usePromptEnhanceStore((state) => state.endpointUrl);
    const modelId = usePromptEnhanceStore((state) => state.modelId);
    const serverMode = usePromptEnhanceStore((state) => state.detectedServerMode);
    const assistantSystemPrompt = usePromptEnhanceStore((state) => state.assistantSystemPrompt);
    const setConnectionState = usePromptEnhanceStore((state) => state.setConnectionState);
    const setAvailableModels = usePromptEnhanceStore((state) => state.setAvailableModels);
    const setDetectedServerMode = usePromptEnhanceStore((state) => state.setDetectedServerMode);
    const setModelId = usePromptEnhanceStore((state) => state.setModelId);
    const setLastSuccessfulModelId = usePromptEnhanceStore((state) => state.setLastSuccessfulModelId);
    const loading = useAssistantStore((state) => state.loading);
    const error = useAssistantStore((state) => state.error);
    const conversation = useAssistantStore((state) => state.conversation);
    const setLoading = useAssistantStore((state) => state.setLoading);
    const setError = useAssistantStore((state) => state.setError);
    const addTurn = useAssistantStore((state) => state.addTurn);
    const setDraft = useAssistantStore((state) => state.setDraft);
    const clearConversation = useAssistantStore((state) => state.clearConversation);
    const setConnection = useAssistantStore((state) => state.setConnection);
    const setSelectedModelId = useAssistantStore((state) => state.setSelectedModelId);
    const [input, setInput] = useState('');

    const refreshConnection = async () => {
        setConnectionState({
            status: 'connecting',
            message: 'Checking assistant endpoint...',
            detectedServerMode: serverMode,
        });
        const probe = await probeAssistantConnection(endpointUrl);
        setConnection(probe.connection);
        setConnectionState({
            status: probe.connection.state,
            message: probe.connection.message,
            availableModels: probe.connection.models.map((item) => ({ id: item.id, name: item.name })),
            detectedServerMode: probe.connection.serverMode,
        });
        setAvailableModels(probe.connection.models.map((item) => ({ id: item.id, name: item.name })));
        setDetectedServerMode(probe.connection.serverMode);
        if (!modelId && probe.connection.models[0]) {
            setModelId(probe.connection.models[0].id);
            setSelectedModelId(probe.connection.models[0].id);
        }
    };

    const sendPrompt = async (message: string) => {
        const trimmed = message.trim();
        if (!trimmed) {
            return;
        }
        if (!modelId) {
            notifications.show({
                title: 'Assistant Model Required',
                message: 'Connect to your local LLM server and select a model first.',
                color: 'yellow',
            });
            return;
        }

        setLoading(true);
        setError(null);
        const contextBlock = buildContextBlock(context);
        const nextUserTurn = createTurn('user', `${trimmed}\n\n${contextBlock}`);
        const nextConversation = [...conversation, nextUserTurn];
        addTurn(nextUserTurn);

        try {
            const result = await chatWithAssistant({
                endpointUrl,
                modelId,
                systemPrompt: assistantSystemPrompt,
                preferredMode: serverMode,
                conversation: nextConversation,
            });

            if (!result.success) {
                setError(result.error || 'Assistant request failed');
                notifications.show({
                    title: 'Assistant Request Failed',
                    message: result.error || 'Assistant request failed',
                    color: 'red',
                });
                return;
            }

            const nextDraft = result.draft || {
                message: result.response,
                promptDraft: null,
                negativePromptDraft: null,
                parameterSuggestions: [],
                reasoningNote: null,
            };

            const assistantTurn = createTurn('assistant', nextDraft.message, nextDraft);
            addTurn(assistantTurn);
            setDraft(nextDraft);
            setLastSuccessfulModelId(modelId);
            setInput('');
        } finally {
            setLoading(false);
        }
    };

    const quickActions = [
        { label: 'Rewrite Prompt', message: 'Rewrite my main prompt to be stronger and more visually specific.', icon: <IconWriting size={14} /> },
        { label: 'Write Negative', message: 'Write or improve the negative prompt for this idea.', icon: <IconMessageCircle size={14} /> },
        { label: 'Suggest Settings', message: 'Suggest safe generation settings for this prompt and model.', icon: <IconSettings size={14} /> },
        { label: 'Explain Why', message: 'Explain the strengths and weaknesses of the current prompt and your suggested changes.', icon: <IconBulb size={14} /> },
    ];

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            notifications.show({
                title: 'Copied',
                message: 'Assistant response copied to clipboard.',
                color: 'teal',
            });
        } catch {
            notifications.show({
                title: 'Copy Failed',
                message: 'Clipboard access was not available.',
                color: 'red',
            });
        }
    };

    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            title={
                <Group gap="xs">
                    <IconBrain size={18} />
                    <Text fw={600}>Prompt Assistant</Text>
                </Group>
            }
            position="right"
            size="lg"
            padding="md"
            overlayProps={{ backgroundOpacity: 0.45, blur: 6 }}
        >
            <Stack gap="md" h="100%">
                <Group justify="space-between" align="center">
                    <Stack gap={2}>
                        <Text size="sm" fw={600}>
                            {modelId || 'No assistant model selected'}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {serverMode === 'legacy-lmstudio'
                                ? 'LM Studio legacy API'
                                : serverMode === 'openai-compatible'
                                    ? 'OpenAI-compatible API'
                                    : 'Server mode not detected yet'}
                        </Text>
                    </Stack>
                    <Group gap="xs">
                        <Tooltip label="Refresh assistant connection">
                            <ActionIcon variant="subtle" onClick={() => void refreshConnection()}>
                                <IconRefresh size={16} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Clear conversation">
                            <ActionIcon variant="subtle" color="red" onClick={clearConversation}>
                                <IconTrash size={16} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>

                <Group gap="xs" wrap="wrap">
                    {quickActions.map((action) => (
                        <Button
                            key={action.label}
                            size="xs"
                            variant="light"
                            leftSection={action.icon}
                            onClick={() => void sendPrompt(action.message)}
                            disabled={loading}
                        >
                            {action.label}
                        </Button>
                    ))}
                </Group>

                <Paper withBorder p="sm" radius="md">
                    <Stack gap={4}>
                        <Text size="xs" c="dimmed">Current context</Text>
                        <Group gap="xs" wrap="wrap">
                            <Badge variant="light">{context.model || 'No model'}</Badge>
                            {context.activeLoras.length > 0 && <Badge variant="light" color="grape">{`${context.activeLoras.length} LoRAs`}</Badge>}
                            {context.activeEmbeddings.length > 0 && <Badge variant="light" color="cyan">{`${context.activeEmbeddings.length} Embeddings`}</Badge>}
                            {context.activeWildcards.length > 0 && <Badge variant="light" color="lime">{`${context.activeWildcards.length} Wildcards`}</Badge>}
                            {context.featureFlags.map((flag) => (
                                <Badge key={flag} variant="dot" color="orange">{flag}</Badge>
                            ))}
                        </Group>
                    </Stack>
                </Paper>

                <ScrollArea flex={1} offsetScrollbars>
                    <Stack gap="sm">
                        {conversation.length === 0 && (
                            <Paper withBorder p="md" radius="md">
                                <Text size="sm" c="dimmed">
                                    Ask for a rewrite, a negative prompt, safer settings, or a more detailed prompt draft.
                                </Text>
                            </Paper>
                        )}
                        {conversation.map((turn) => (
                            <Paper
                                key={turn.id}
                                p="md"
                                radius="md"
                                style={turnBubbleTone(turn.role)}
                            >
                                <Stack gap="xs">
                                    <Group justify="space-between" align="center">
                                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                                            {turn.role === 'assistant' ? 'Assistant' : 'You'}
                                        </Text>
                                        <Text size="xs" c="dimmed">
                                            {new Date(turn.createdAt).toLocaleTimeString()}
                                        </Text>
                                    </Group>
                                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                        {turn.role === 'user'
                                            ? turn.content.split('\n\nCurrent workspace context:')[0]
                                            : turn.content}
                                    </Text>

                                    {turn.role === 'assistant' && turn.draft && (
                                        <>
                                            {turn.draft.promptDraft && (
                                                <Box>
                                                    <Text size="xs" fw={600} mb={4}>Prompt draft</Text>
                                                    <Paper withBorder p="sm" radius="sm">
                                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{turn.draft.promptDraft}</Text>
                                                    </Paper>
                                                </Box>
                                            )}
                                            {turn.draft.negativePromptDraft && (
                                                <Box>
                                                    <Text size="xs" fw={600} mb={4}>Negative prompt draft</Text>
                                                    <Paper withBorder p="sm" radius="sm">
                                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{turn.draft.negativePromptDraft}</Text>
                                                    </Paper>
                                                </Box>
                                            )}
                                            {(turn.draft.parameterSuggestions || []).length > 0 && (
                                                <Box>
                                                    <Text size="xs" fw={600} mb={4}>Suggested settings</Text>
                                                    <Stack gap={4}>
                                                        {(turn.draft.parameterSuggestions || []).map((item) => (
                                                            <Group key={`${turn.id}-${item.key}`} justify="space-between" align="flex-start">
                                                                <Text size="sm">
                                                                    {item.key}: <Text component="span" fw={600}>{String(item.value)}</Text>
                                                                </Text>
                                                                {item.reason ? <Text size="xs" c="dimmed">{item.reason}</Text> : null}
                                                            </Group>
                                                        ))}
                                                    </Stack>
                                                </Box>
                                            )}
                                            {turn.draft.reasoningNote && (
                                                <>
                                                    <Divider />
                                                    <Text size="xs" c="dimmed" style={{ whiteSpace: 'pre-wrap' }}>
                                                        {turn.draft.reasoningNote}
                                                    </Text>
                                                </>
                                            )}

                                            <Group gap="xs" wrap="wrap">
                                                {turn.draft.promptDraft && (
                                                    <>
                                                        <Button
                                                            size="xs"
                                                            variant="light"
                                                            onClick={() => onApplyPatch({ prompt: turn.draft?.promptDraft || '' })}
                                                        >
                                                            Replace Prompt
                                                        </Button>
                                                        <Button
                                                            size="xs"
                                                            variant="subtle"
                                                            onClick={() => onApplyPatch({ promptAppend: turn.draft?.promptDraft || '' })}
                                                        >
                                                            Append Prompt
                                                        </Button>
                                                    </>
                                                )}
                                                {turn.draft.negativePromptDraft && (
                                                    <Button
                                                        size="xs"
                                                        variant="light"
                                                        color="grape"
                                                        onClick={() => onApplyPatch({ negativeprompt: turn.draft?.negativePromptDraft || '' })}
                                                    >
                                                        Replace Negative
                                                    </Button>
                                                )}
                                                {(turn.draft.parameterSuggestions || []).length > 0 && (
                                                    <Button
                                                        size="xs"
                                                        variant="light"
                                                        color="orange"
                                                        onClick={() => onApplyPatch(draftToParameterPatch(turn.draft))}
                                                    >
                                                        Apply Settings
                                                    </Button>
                                                )}
                                                <Button
                                                    size="xs"
                                                    variant="light"
                                                    color="teal"
                                                    onClick={() => onApplyAndGenerate({
                                                        ...(turn.draft?.promptDraft ? { prompt: turn.draft.promptDraft } : {}),
                                                        ...(turn.draft?.negativePromptDraft ? { negativeprompt: turn.draft.negativePromptDraft } : {}),
                                                        ...draftToParameterPatch(turn.draft),
                                                    })}
                                                >
                                                    Generate With This Draft
                                                </Button>
                                                <ActionIcon
                                                    variant="subtle"
                                                    onClick={() => void handleCopy([
                                                        turn.content,
                                                        turn.draft?.promptDraft ? `\n\nPrompt Draft:\n${turn.draft.promptDraft}` : '',
                                                        turn.draft?.negativePromptDraft ? `\n\nNegative Prompt Draft:\n${turn.draft.negativePromptDraft}` : '',
                                                    ].join(''))}
                                                >
                                                    <IconCopy size={14} />
                                                </ActionIcon>
                                            </Group>
                                        </>
                                    )}
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </ScrollArea>

                {error && (
                    <Text size="sm" c="red">
                        {error}
                    </Text>
                )}

                <Textarea
                    placeholder="Tell the assistant what you want to improve..."
                    minRows={3}
                    maxRows={8}
                    autosize
                    value={input}
                    onChange={(event) => setInput(event.currentTarget.value)}
                />
                <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed">
                        Suggestions stay separate until you apply them.
                    </Text>
                    <Button
                        rightSection={loading ? <Loader size={14} /> : <IconArrowUp size={14} />}
                        onClick={() => void sendPrompt(input)}
                        disabled={loading || !input.trim()}
                    >
                        Send
                    </Button>
                </Group>
            </Stack>
        </Drawer>
    );
}
