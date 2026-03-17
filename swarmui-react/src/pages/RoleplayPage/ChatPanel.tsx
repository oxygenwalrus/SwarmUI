import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActionIcon,
    Group,
    Loader,
    ScrollArea,
    Stack,
    Text,
    Textarea,
    Tooltip,
} from '@mantine/core';
import { IconRefresh, IconSend, IconSparkles, IconTrash, IconPlayerStop, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useShallow } from 'zustand/react/shallow';
import { ElevatedCard } from '../../components/ui/ElevatedCard';
import { SwarmButton } from '../../components/ui/SwarmButton';
import { useRoleplayStore } from '../../stores/roleplayStore';
import { streamRoleplayChat, parseSceneTag } from '../../services/roleplayChatService';
import type { ChatMessage, RoleplayCharacter } from '../../types/roleplay';
import { CharacterAvatar } from './CharacterAvatar';

const MAX_CONTEXT_MESSAGES = 20;

interface ChatPanelProps {
    onRegenerateScene?: () => void;
    onGenerateSceneWithPrompt?: (prompt: string) => void;
}

export function ChatPanel({ onRegenerateScene, onGenerateSceneWithPrompt }: ChatPanelProps) {
    const [input, setInput] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);

    const {
        activeCharacterId,
        conversations,
        isStreamingChat,
        streamingContent,
        connectionStatus,
        lmStudioEndpoint,
        selectedModelId,
        detectedServerMode,
        chatTemperature,
        chatMaxTokens,
        addMessage,
        clearConversation,
        setStreamingChat,
        setStreamingContent,
        appendStreamingContent,
        dismissSuggestion,
        getActiveCharacter,
        setDetectedServerMode,
    } = useRoleplayStore(
        useShallow((s) => ({
            activeCharacterId: s.activeCharacterId,
            conversations: s.conversations,
            isStreamingChat: s.isStreamingChat,
            streamingContent: s.streamingContent,
            connectionStatus: s.connectionStatus,
            lmStudioEndpoint: s.lmStudioEndpoint,
            selectedModelId: s.selectedModelId,
            detectedServerMode: s.detectedServerMode,
            chatTemperature: s.chatTemperature,
            chatMaxTokens: s.chatMaxTokens,
            addMessage: s.addMessage,
            clearConversation: s.clearConversation,
            setStreamingChat: s.setStreamingChat,
            setStreamingContent: s.setStreamingContent,
            appendStreamingContent: s.appendStreamingContent,
            dismissSuggestion: s.dismissSuggestion,
            getActiveCharacter: s.getActiveCharacter,
            setDetectedServerMode: s.setDetectedServerMode,
        }))
    );

    const messages = activeCharacterId ? conversations[activeCharacterId] ?? [] : [];
    const activeCharacter = getActiveCharacter();

    // Auto-scroll to bottom
    useEffect(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
    }, [messages.length, streamingContent]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || !activeCharacterId || !activeCharacter) return;
        if (connectionStatus !== 'connected' || !detectedServerMode) {
            notifications.show({
                title: 'Not Connected',
                message: 'Connect to LM Studio first via the settings in the sidebar.',
                color: 'orange',
            });
            return;
        }

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input.trim(),
            timestamp: Date.now(),
            sceneImageUrl: null,
            suggestedImagePrompt: null,
        };

        addMessage(activeCharacterId, userMessage);
        setInput('');

        // Build messages for the API
        const conversationMessages = [
            ...(conversations[activeCharacterId] ?? []),
            userMessage,
        ];
        const recentMessages = conversationMessages.slice(-MAX_CONTEXT_MESSAGES);
        const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
            { role: 'system', content: activeCharacter.systemPrompt },
            ...recentMessages.map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
        ];

        // Start streaming
        setStreamingChat(true);
        setStreamingContent('');

        const controller = new AbortController();
        abortRef.current = controller;

        await streamRoleplayChat({
            endpointUrl: lmStudioEndpoint,
            serverMode: detectedServerMode,
            modelId: selectedModelId,
            messages: apiMessages,
            temperature: chatTemperature,
            maxTokens: chatMaxTokens,
            onToken: (token) => {
                appendStreamingContent(token);
            },
            onServerModeCorrection: (correctedMode) => {
                setDetectedServerMode(correctedMode);
            },
            onDone: (fullText) => {
                // Strip [SCENE: ...] tag and capture it separately
                const { cleanText, scenePrompt } = parseSceneTag(fullText);
                const assistantMessage: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: cleanText,
                    timestamp: Date.now(),
                    sceneImageUrl: null,
                    suggestedImagePrompt: scenePrompt,
                };
                addMessage(activeCharacterId, assistantMessage);
                setStreamingChat(false);
                setStreamingContent('');
                abortRef.current = null;
            },
            onError: (error) => {
                notifications.show({
                    title: 'Chat Error',
                    message: error,
                    color: 'red',
                });
                setStreamingChat(false);
                setStreamingContent('');
                abortRef.current = null;
            },
            signal: controller.signal,
        });
    }, [
        input,
        activeCharacterId,
        activeCharacter,
        connectionStatus,
        detectedServerMode,
        chatTemperature,
        chatMaxTokens,
        conversations,
        lmStudioEndpoint,
        selectedModelId,
        addMessage,
        setStreamingChat,
        setStreamingContent,
        appendStreamingContent,
        setDetectedServerMode,
    ]);

    const handleAbort = useCallback(() => {
        abortRef.current?.abort();
        // Commit whatever was streamed so far
        if (streamingContent && activeCharacterId) {
            const partialMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: streamingContent,
                timestamp: Date.now(),
                sceneImageUrl: null,
                suggestedImagePrompt: null,
            };
            addMessage(activeCharacterId, partialMessage);
        }
        setStreamingChat(false);
        setStreamingContent('');
        abortRef.current = null;
    }, [streamingContent, activeCharacterId, addMessage, setStreamingChat, setStreamingContent]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!activeCharacter) {
        return (
            <Stack h="100%" align="center" justify="center" gap="sm">
                <Text size="lg" c="dimmed">No character selected</Text>
                <Text size="sm" c="dimmed">Select or create a character in the sidebar</Text>
            </Stack>
        );
    }

    return (
        <Stack h="100%" gap={0} style={{ backgroundColor: '#111111' }}>
            {/* Chat Header */}
            <Group
                justify="space-between"
                p="xs"
                style={{ borderBottom: '1px solid var(--theme-gray-5)' }}
            >
                <Group gap="xs">
                    <CharacterAvatar character={activeCharacter} size={28} />
                    <Text size="sm" fw={600} c="var(--theme-text-primary)">
                        {activeCharacter.name}
                    </Text>
                </Group>
                <Tooltip label="Clear conversation">
                    <ActionIcon
                        variant="subtle"
                        size="sm"
                        color="gray"
                        onClick={() => activeCharacterId && clearConversation(activeCharacterId)}
                        disabled={messages.length === 0}
                    >
                        <IconTrash size={14} />
                    </ActionIcon>
                </Tooltip>
            </Group>

            {/* Messages Area */}
            <ScrollArea
                flex={1}
                p="xs"
                viewportRef={viewportRef}
                styles={{ viewport: { backgroundColor: '#111111' } }}
            >
                <Stack gap="xs" ref={scrollRef}>
                    {messages.length === 0 && !isStreamingChat && (
                        <Text size="sm" c="dimmed" ta="center" mt="xl">
                            Start a conversation with {activeCharacter.name}
                        </Text>
                    )}

                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            character={activeCharacter}
                            activeCharacterId={activeCharacterId}
                            onRegenerateScene={message.sceneImageUrl ? onRegenerateScene : undefined}
                            onGenerateSceneWithPrompt={onGenerateSceneWithPrompt}
                            onDismissSuggestion={dismissSuggestion}
                        />
                    ))}

                    {/* Streaming indicator */}
                    {isStreamingChat && streamingContent && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                            <Group gap="xs" align="flex-start" wrap="nowrap">
                                <div style={{ paddingTop: 4, flexShrink: 0 }}>
                                    <CharacterAvatar character={activeCharacter} size={28} />
                                </div>
                                <ElevatedCard elevation="table" tone="neutral" style={{ maxWidth: '80%' }}>
                                    <Stack gap={4}>
                                        <Text size="xs" fw={600} c="dimmed">
                                            {activeCharacter.name}
                                        </Text>
                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                            {streamingContent}
                                            <span
                                                style={{
                                                    display: 'inline-block',
                                                    width: 6,
                                                    height: 14,
                                                    backgroundColor: 'var(--theme-brand)',
                                                    marginLeft: 2,
                                                    animation: 'blink 1s step-end infinite',
                                                    verticalAlign: 'text-bottom',
                                                }}
                                            />
                                        </Text>
                                    </Stack>
                                </ElevatedCard>
                            </Group>
                        </div>
                    )}

                    {isStreamingChat && !streamingContent && (
                        <Group gap="xs" p="xs">
                            <CharacterAvatar character={activeCharacter} size={24} />
                            <Loader size="xs" />
                            <Text size="xs" c="dimmed">
                                {activeCharacter.name} is thinking...
                            </Text>
                        </Group>
                    )}
                </Stack>
            </ScrollArea>

            {/* Input Area */}
            <Group
                gap="xs"
                p="xs"
                align="flex-end"
                style={{ borderTop: '1px solid var(--theme-gray-5)' }}
            >
                <Textarea
                    flex={1}
                    placeholder={`Message ${activeCharacter.name}... (Shift+Enter for new line)`}
                    value={input}
                    onChange={(e) => setInput(e.currentTarget.value)}
                    onKeyDown={handleKeyDown}
                    autosize
                    minRows={1}
                    maxRows={4}
                    disabled={isStreamingChat}
                    size="sm"
                />
                {isStreamingChat ? (
                    <SwarmButton
                        tone="danger"
                        emphasis="solid"
                        size="sm"
                        onClick={handleAbort}
                        leftSection={<IconPlayerStop size={16} />}
                    >
                        Stop
                    </SwarmButton>
                ) : (
                    <SwarmButton
                        tone="brand"
                        emphasis="solid"
                        size="sm"
                        onClick={handleSend}
                        disabled={!input.trim() || connectionStatus !== 'connected'}
                        leftSection={<IconSend size={16} />}
                    >
                        Send
                    </SwarmButton>
                )}
            </Group>

            {/* Blinking cursor animation */}
            <style>{`
                @keyframes blink {
                    50% { opacity: 0; }
                }
            `}</style>
        </Stack>
    );
}

interface MessageBubbleProps {
    message: ChatMessage;
    character: RoleplayCharacter;
    activeCharacterId: string | null;
    onRegenerateScene?: () => void;
    onGenerateSceneWithPrompt?: (prompt: string) => void;
    onDismissSuggestion: (characterId: string, messageId: string) => void;
}

function MessageBubble({
    message,
    character,
    activeCharacterId,
    onRegenerateScene,
    onGenerateSceneWithPrompt,
    onDismissSuggestion,
}: MessageBubbleProps) {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <ElevatedCard
                    elevation="paper"
                    tone="brand"
                    style={{ maxWidth: '80%' }}
                >
                    <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                        {message.content}
                    </Text>
                </ElevatedCard>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <Group gap="xs" align="flex-start" wrap="nowrap">
                <div style={{ paddingTop: 4, flexShrink: 0 }}>
                    <CharacterAvatar character={character} size={28} />
                </div>
                <Stack gap={4} style={{ maxWidth: '80%' }}>
                    <ElevatedCard elevation="table" tone="neutral">
                        <Stack gap={4}>
                            <Text size="xs" fw={600} c="dimmed">
                                {character.name}
                            </Text>
                            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                {message.content}
                            </Text>
                            {message.sceneImageUrl && (
                                <div style={{ position: 'relative', marginTop: 4 }}>
                                    <img
                                        src={message.sceneImageUrl}
                                        alt="Scene"
                                        style={{
                                            maxWidth: '100%',
                                            borderRadius: 'calc(6px * var(--theme-radius-multiplier))',
                                            display: 'block',
                                        }}
                                    />
                                    {onRegenerateScene && (
                                        <Tooltip label="Regenerate scene">
                                            <ActionIcon
                                                variant="filled"
                                                color="dark"
                                                size="sm"
                                                style={{
                                                    position: 'absolute',
                                                    top: 6,
                                                    right: 6,
                                                    opacity: 0.8,
                                                }}
                                                onClick={onRegenerateScene}
                                            >
                                                <IconRefresh size={12} />
                                            </ActionIcon>
                                        </Tooltip>
                                    )}
                                </div>
                            )}
                        </Stack>
                    </ElevatedCard>

                    {/* Scene suggestion card — shown when AI embedded a [SCENE: ...] tag */}
                    {message.suggestedImagePrompt && !message.sceneImageUrl && (
                        <ElevatedCard elevation="table" tone="brand">
                            <Stack gap={6}>
                                <Group justify="space-between" wrap="nowrap">
                                    <Group gap={4}>
                                        <IconSparkles size={12} color="var(--theme-brand)" />
                                        <Text size="xs" fw={600}>Scene suggested</Text>
                                    </Group>
                                    <Tooltip label="Dismiss">
                                        <ActionIcon
                                            variant="subtle"
                                            size="xs"
                                            color="gray"
                                            onClick={() => activeCharacterId && onDismissSuggestion(activeCharacterId, message.id)}
                                        >
                                            <IconX size={10} />
                                        </ActionIcon>
                                    </Tooltip>
                                </Group>
                                <Text size="xs" c="dimmed" lineClamp={2}>
                                    {message.suggestedImagePrompt}
                                </Text>
                                <SwarmButton
                                    tone="brand"
                                    emphasis="solid"
                                    size="xs"
                                    leftSection={<IconSparkles size={12} />}
                                    onClick={() => onGenerateSceneWithPrompt?.(message.suggestedImagePrompt!)}
                                    disabled={!onGenerateSceneWithPrompt}
                                >
                                    Generate This Scene
                                </SwarmButton>
                            </Stack>
                        </ElevatedCard>
                    )}
                </Stack>
            </Group>
        </div>
    );
}
