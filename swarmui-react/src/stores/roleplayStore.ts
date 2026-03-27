import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
    RoleplayCharacter,
    ChatMessage,
    RoleplayConnectionState,
    RoleplayInteractionStyle,
    RoleplayMemoryFact,
    RoleplayMemoryStatus,
} from '../types/roleplay';
import type { AssistantModel, AssistantServerMode } from '../types/assistant';
import {
    DEFAULT_ROLEPLAY_INTERACTION_STYLE,
    LEGACY_ROLEPLAY_INTERACTION_STYLE,
    getRoleplayInteractionStyleConfig,
} from '../data/roleplayInteractionStyles';
import {
    ROLEPLAY_MAX_MEMORY_FACTS,
    createEmptyRoleplayMemoryState,
} from '../features/roleplay/roleplayMemory';
import {
    createDefaultPromptSet,
    createEmptyRoleplayPersonalityProfile,
    getEffectiveSystemPrompt,
} from '../features/roleplay/roleplayCharacterPrompting';

type LegacyRoleplayCharacter = Omit<
    RoleplayCharacter,
    | 'interactionStyle'
    | 'personalityProfile'
    | 'conversationSummary'
    | 'continuity'
    | 'imageModelId'
    | 'chatSystemPrompt'
    | 'roleplaySystemPrompt'
    | 'openingChatMessage'
    | 'openingRoleplayMessage'
    | 'memoryFacts'
    | 'memoryStatus'
    | 'messagesSinceMemoryRefresh'
    | 'lastMemoryUpdatedAt'
    | 'lastVisitedAt'
> & {
    interactionStyle?: RoleplayInteractionStyle;
    personalityProfile?: RoleplayCharacter['personalityProfile'];
    conversationSummary?: string;
    continuity?: RoleplayCharacter['continuity'];
    imageModelId?: string | null;
    chatSystemPrompt?: string;
    roleplaySystemPrompt?: string;
    openingChatMessage?: string;
    openingRoleplayMessage?: string;
    memoryFacts?: RoleplayMemoryFact[];
    memoryStatus?: RoleplayMemoryStatus;
    messagesSinceMemoryRefresh?: number;
    lastMemoryUpdatedAt?: number | null;
    lastVisitedAt?: number | null;
};

function normalizeCharacter(character: RoleplayCharacter | LegacyRoleplayCharacter): RoleplayCharacter {
    const defaultPromptSet = createDefaultPromptSet();
    const chatSystemPrompt =
        character.chatSystemPrompt ??
        (character.interactionStyle === 'personal-chat'
            ? character.systemPrompt
            : defaultPromptSet.chatSystemPrompt);
    const roleplaySystemPrompt =
        character.roleplaySystemPrompt ??
        (character.interactionStyle === 'storyteller'
            ? character.systemPrompt
            : defaultPromptSet.roleplaySystemPrompt);
    return {
        ...character,
        interactionStyle: character.interactionStyle ?? LEGACY_ROLEPLAY_INTERACTION_STYLE,
        personalityProfile: character.personalityProfile ?? createEmptyRoleplayPersonalityProfile(),
        conversationSummary: character.conversationSummary ?? '',
        continuity: character.continuity ?? createEmptyRoleplayMemoryState().continuity,
        imageModelId: character.imageModelId ?? null,
        chatSystemPrompt,
        roleplaySystemPrompt,
        openingChatMessage: character.openingChatMessage ?? '',
        openingRoleplayMessage: character.openingRoleplayMessage ?? '',
        memoryFacts: character.memoryFacts ?? [],
        memoryStatus: character.memoryStatus ?? 'idle',
        messagesSinceMemoryRefresh: character.messagesSinceMemoryRefresh ?? 0,
        lastMemoryUpdatedAt: character.lastMemoryUpdatedAt ?? null,
        lastVisitedAt: character.lastVisitedAt ?? null,
        systemPrompt: getEffectiveSystemPrompt({
            interactionStyle: character.interactionStyle ?? LEGACY_ROLEPLAY_INTERACTION_STYLE,
            chatSystemPrompt,
            roleplaySystemPrompt,
            systemPrompt: character.systemPrompt ?? '',
        }),
    };
}

/*
const SCENE_TAG_INSTRUCTION =
    '\n\nWhen a scene is vivid and worth illustrating — a dramatic location, a creature, ' +
    'a key moment — write [SCENE: detailed image generation prompt] on its own line. ' +
    'Make the image prompt specific: describe lighting, mood, style, subject, and composition.';
*/

const defaultInteractionStyleConfig = getRoleplayInteractionStyleConfig(DEFAULT_ROLEPLAY_INTERACTION_STYLE);

const DEFAULT_CHARACTERS: RoleplayCharacter[] = [
    normalizeCharacter({
        id: 'default-companion',
        name: 'Companion',
        avatar: null,
        interactionStyle: DEFAULT_ROLEPLAY_INTERACTION_STYLE,
        appearancePrompt: null,
        imageModelId: null,
        personalityProfile: createEmptyRoleplayPersonalityProfile(),
        characterLora: null,
        characterLoraWeight: 0.8,
        ipAdapterEnabled: false,
        ipAdapterModel: 'faceid plus v2',
        ipAdapterWeight: 1.0,
        personality: 'Warm, attentive, and personal. Talks directly to the user without narrating for them.',
        systemPrompt: defaultInteractionStyleConfig.systemPrompt,
        chatSystemPrompt: createDefaultPromptSet().chatSystemPrompt,
        roleplaySystemPrompt: createDefaultPromptSet().roleplaySystemPrompt,
        openingChatMessage: '',
        openingRoleplayMessage: '',
        sceneSuggestionPrompt: defaultInteractionStyleConfig.sceneSuggestionPrompt,
        ...createEmptyRoleplayMemoryState(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
    }),
];

interface RoleplayStoreState {
    // Characters
    characters: RoleplayCharacter[];
    activeCharacterId: string | null;

    // Conversations (keyed by character ID)
    conversations: Record<string, ChatMessage[]>;

    // Chat streaming
    isStreamingChat: boolean;
    streamingContent: string;

    // Connection
    connectionStatus: RoleplayConnectionState;
    connectionMessage: string | null;
    lmStudioEndpoint: string;
    selectedModelId: string;
    detectedServerMode: AssistantServerMode | null;
    availableModels: AssistantModel[];

    // Image generation parameters (persisted)
    imageSteps: number;
    imageCfgScale: number;
    imageClipStopAtLayer: number | null;
    /**
     * SwarmUI checkpoint model name for image generation.
     * Empty string means "inherit whatever is selected on the Generate page".
     */
    imageModelId: string;

    // LLM parameters (persisted)
    chatTemperature: number;
    chatMaxTokens: number;

    // Image dimensions (persisted, replaces ScenePanel local state)
    imageWidth: number;
    imageHeight: number;

    // Portrait generation (ephemeral)
    generatingPortraitForId: string | null;

    // Actions - Characters
    addCharacter: (character: RoleplayCharacter) => void;
    updateCharacter: (id: string, updates: Partial<Omit<RoleplayCharacter, 'id'>>) => void;
    removeCharacter: (id: string) => void;
    setActiveCharacter: (id: string | null) => void;
    updateCharacterAvatar: (id: string, avatarUrl: string) => void;

    // Actions - Chat
    addMessage: (characterId: string, message: ChatMessage) => void;
    updateMessage: (
        characterId: string,
        messageId: string,
        updates: Partial<Omit<ChatMessage, 'id' | 'role' | 'timestamp'>>
    ) => void;
    clearConversation: (characterId: string) => void;
    setStreamingChat: (streaming: boolean) => void;
    setStreamingContent: (content: string) => void;
    appendStreamingContent: (token: string) => void;
    attachSceneImageToLastMessage: (characterId: string, imageUrl: string) => void;
    dismissSuggestion: (characterId: string, messageId: string) => void;
    setCharacterMemoryStatus: (characterId: string, status: RoleplayMemoryStatus) => void;
    incrementMessagesSinceMemoryRefresh: (characterId: string, amount?: number) => void;
    applyGeneratedMemory: (
        characterId: string,
        summary: string,
        continuity: RoleplayCharacter['continuity'],
        facts: RoleplayMemoryFact[],
        updatedAt?: number
    ) => void;
    clearCharacterMemory: (characterId: string) => void;
    addMemoryFact: (characterId: string, text: string) => void;
    updateMemoryFact: (characterId: string, factId: string, text: string) => void;
    removeMemoryFact: (characterId: string, factId: string) => void;
    toggleMemoryFactPinned: (characterId: string, factId: string) => void;
    addContinuityThread: (characterId: string, text: string) => void;
    removeContinuityThread: (characterId: string, threadIndex: number) => void;
    moveContinuityThread: (characterId: string, threadIndex: number, direction: -1 | 1) => void;
    markCharacterVisited: (characterId: string, visitedAt?: number) => void;

    // Actions - Connection
    setConnectionStatus: (status: RoleplayConnectionState) => void;
    setConnectionMessage: (message: string | null) => void;
    setLmStudioEndpoint: (endpoint: string) => void;
    setSelectedModelId: (modelId: string) => void;
    setDetectedServerMode: (mode: AssistantServerMode | null) => void;
    setAvailableModels: (models: AssistantModel[]) => void;

    // Actions - Image params
    setImageSteps: (v: number) => void;
    setImageCfgScale: (v: number) => void;
    setImageClipStopAtLayer: (v: number | null) => void;
    setImageModelId: (id: string) => void;
    setChatTemperature: (v: number) => void;
    setChatMaxTokens: (v: number) => void;
    setImageDimensions: (width: number, height: number) => void;

    // Actions - Portrait
    setGeneratingPortraitForId: (id: string | null) => void;

    // Derived
    getActiveCharacter: () => RoleplayCharacter | null;
    getActiveConversation: () => ChatMessage[];
}

export const useRoleplayStore = create<RoleplayStoreState>()(
    devtools(
        persist(
            (set, get) => ({
                // Characters
                characters: DEFAULT_CHARACTERS,
                activeCharacterId: DEFAULT_CHARACTERS[0].id,

                // Conversations
                conversations: {},

                // Streaming
                isStreamingChat: false,
                streamingContent: '',

                // Connection
                connectionStatus: 'idle',
                connectionMessage: null,
                lmStudioEndpoint: 'http://localhost:1234',
                selectedModelId: '',
                detectedServerMode: null,
                availableModels: [],

                // Image params
                imageSteps: 20,
                imageCfgScale: 7,
                imageClipStopAtLayer: null,
                imageModelId: '',
                chatTemperature: 0.8,
                chatMaxTokens: 2048,
                imageWidth: 768,
                imageHeight: 512,

                // Portrait
                generatingPortraitForId: null,

                // Character actions
                addCharacter: (character) =>
                    set((state) => ({
                        characters: [...state.characters, normalizeCharacter(character)],
                    })),

                updateCharacter: (id, updates) =>
                    set((state) => ({
                        characters: state.characters.map((c) =>
                            c.id === id ? normalizeCharacter({ ...c, ...updates, updatedAt: Date.now() }) : c
                        ),
                    })),

                removeCharacter: (id) =>
                    set((state) => {
                        const next: Partial<RoleplayStoreState> = {
                            characters: state.characters.filter((c) => c.id !== id),
                        };
                        if (state.activeCharacterId === id) {
                            next.activeCharacterId = state.characters.find((c) => c.id !== id)?.id ?? null;
                        }
                        return next;
                    }),

                setActiveCharacter: (id) =>
                    set({ activeCharacterId: id, streamingContent: '', isStreamingChat: false }),

                updateCharacterAvatar: (id, avatarUrl) =>
                    set((state) => ({
                        characters: state.characters.map((c) =>
                            c.id === id ? normalizeCharacter({ ...c, avatar: avatarUrl, updatedAt: Date.now() }) : c
                        ),
                    })),

                // Chat actions
                addMessage: (characterId, message) =>
                    set((state) => ({
                        conversations: {
                            ...state.conversations,
                            [characterId]: [...(state.conversations[characterId] ?? []), message],
                        },
                    })),

                updateMessage: (characterId, messageId, updates) =>
                    set((state) => {
                        const messages = state.conversations[characterId];
                        if (!messages) {
                            return {};
                        }

                        return {
                            conversations: {
                                ...state.conversations,
                                [characterId]: messages.map((message) =>
                                    message.id === messageId
                                        ? {
                                              ...message,
                                              ...updates,
                                          }
                                        : message
                                ),
                            },
                        };
                    }),

                clearConversation: (characterId) =>
                    set((state) => ({
                        conversations: {
                            ...state.conversations,
                            [characterId]: [],
                        },
                        characters: state.characters.map((character) =>
                            character.id === characterId
                                ? {
                                      ...character,
                                      ...createEmptyRoleplayMemoryState(),
                                      updatedAt: Date.now(),
                                  }
                                : character
                        ),
                    })),

                setStreamingChat: (streaming) => set({ isStreamingChat: streaming }),
                setStreamingContent: (content) => set({ streamingContent: content }),
                appendStreamingContent: (token) =>
                    set((state) => ({ streamingContent: state.streamingContent + token })),

                attachSceneImageToLastMessage: (characterId, imageUrl) =>
                    set((state) => {
                        const msgs = state.conversations[characterId];
                        if (!msgs || msgs.length === 0) return {};

                        // Find last assistant message
                        let lastIdx = -1;
                        for (let i = msgs.length - 1; i >= 0; i--) {
                            if (msgs[i].role === 'assistant') {
                                lastIdx = i;
                                break;
                            }
                        }
                        if (lastIdx === -1) return {};

                        const updated = msgs.map((m, i) =>
                            i === lastIdx ? { ...m, sceneImageUrl: imageUrl } : m
                        );
                        return {
                            conversations: {
                                ...state.conversations,
                                [characterId]: updated,
                            },
                        };
                    }),

                dismissSuggestion: (characterId, messageId) =>
                    set((state) => {
                        const msgs = state.conversations[characterId];
                        if (!msgs) return {};
                        return {
                            conversations: {
                                ...state.conversations,
                                [characterId]: msgs.map((m) =>
                                    m.id === messageId ? { ...m, suggestedImagePrompt: null } : m
                                ),
                            },
                        };
                    }),

                setCharacterMemoryStatus: (characterId, status) =>
                    set((state) => ({
                        characters: state.characters.map((character) =>
                            character.id === characterId
                                ? { ...character, memoryStatus: status, updatedAt: Date.now() }
                                : character
                        ),
                    })),

                incrementMessagesSinceMemoryRefresh: (characterId, amount = 1) =>
                    set((state) => ({
                        characters: state.characters.map((character) =>
                            character.id === characterId
                                ? {
                                      ...character,
                                      messagesSinceMemoryRefresh:
                                          character.messagesSinceMemoryRefresh + amount,
                                      updatedAt: Date.now(),
                                  }
                                : character
                        ),
                    })),

                applyGeneratedMemory: (characterId, summary, continuity, facts, updatedAt = Date.now()) =>
                    set((state) => ({
                        characters: state.characters.map((character) =>
                            character.id === characterId
                                ? {
                                      ...character,
                                      conversationSummary: summary.trim(),
                                      continuity: {
                                          relationshipSummary: continuity.relationshipSummary.trim(),
                                          currentLocation: continuity.currentLocation.trim(),
                                          currentSituation: continuity.currentSituation.trim(),
                                          openThreads: continuity.openThreads
                                              .map((thread) => thread.trim())
                                              .filter((thread) => thread),
                                      },
                                      memoryFacts: facts,
                                      memoryStatus: 'idle',
                                      messagesSinceMemoryRefresh: 0,
                                      lastMemoryUpdatedAt: updatedAt,
                                      updatedAt,
                                  }
                                : character
                        ),
                    })),

                clearCharacterMemory: (characterId) =>
                    set((state) => ({
                        characters: state.characters.map((character) =>
                            character.id === characterId
                                ? {
                                      ...character,
                                      ...createEmptyRoleplayMemoryState(),
                                      updatedAt: Date.now(),
                                  }
                                : character
                        ),
                    })),

                addMemoryFact: (characterId, text) =>
                    set((state) => {
                        const trimmedText = text.trim();
                        if (!trimmedText) {
                            return {};
                        }

                        const now = Date.now();
                        return {
                            characters: state.characters.map((character) =>
                                character.id === characterId
                                    ? character.memoryFacts.length >= ROLEPLAY_MAX_MEMORY_FACTS
                                        ? character
                                        : {
                                              ...character,
                                              memoryFacts: [
                                                  ...character.memoryFacts,
                                                  {
                                                      id: crypto.randomUUID(),
                                                      text: trimmedText,
                                                      pinned: true,
                                                      createdAt: now,
                                                      updatedAt: now,
                                                  },
                                              ],
                                              updatedAt: now,
                                          }
                                    : character
                            ),
                        };
                    }),

                updateMemoryFact: (characterId, factId, text) =>
                    set((state) => {
                        const now = Date.now();
                        return {
                            characters: state.characters.map((character) =>
                                character.id === characterId
                                    ? {
                                          ...character,
                                          memoryFacts: character.memoryFacts
                                              .map((fact) =>
                                                  fact.id === factId
                                                      ? {
                                                            ...fact,
                                                            text,
                                                            updatedAt: Date.now(),
                                                        }
                                                      : fact
                                              ),
                                          updatedAt: now,
                                      }
                                    : character
                            ),
                        };
                    }),

                removeMemoryFact: (characterId, factId) =>
                    set((state) => ({
                        characters: state.characters.map((character) =>
                            character.id === characterId
                                ? {
                                      ...character,
                                      memoryFacts: character.memoryFacts.filter((fact) => fact.id !== factId),
                                      updatedAt: Date.now(),
                                  }
                                : character
                        ),
                    })),

                toggleMemoryFactPinned: (characterId, factId) =>
                    set((state) => ({
                        characters: state.characters.map((character) =>
                            character.id === characterId
                                ? {
                                      ...character,
                                      memoryFacts: character.memoryFacts.map((fact) =>
                                          fact.id === factId
                                              ? {
                                                    ...fact,
                                                    pinned: !fact.pinned,
                                                    updatedAt: Date.now(),
                                                }
                                              : fact
                                      ),
                                      updatedAt: Date.now(),
                                  }
                                : character
                        ),
                    })),

                addContinuityThread: (characterId, text) =>
                    set((state) => {
                        const trimmedText = text.trim().replace(/\s+/g, ' ');
                        if (!trimmedText) {
                            return {};
                        }

                        return {
                            characters: state.characters.map((character) => {
                                if (character.id !== characterId) {
                                    return character;
                                }

                                const existingThreads = character.continuity.openThreads.map((thread) => thread.trim());
                                if (existingThreads.includes(trimmedText)) {
                                    return character;
                                }

                                return {
                                    ...character,
                                    continuity: {
                                        ...character.continuity,
                                        openThreads: [...existingThreads, trimmedText].slice(0, 6),
                                    },
                                    updatedAt: Date.now(),
                                };
                            }),
                        };
                    }),

                removeContinuityThread: (characterId, threadIndex) =>
                    set((state) => ({
                        characters: state.characters.map((character) =>
                            character.id === characterId
                                ? {
                                      ...character,
                                      continuity: {
                                          ...character.continuity,
                                          openThreads: character.continuity.openThreads.filter(
                                              (_thread, index) => index !== threadIndex
                                          ),
                                      },
                                      updatedAt: Date.now(),
                                  }
                                : character
                        ),
                    })),

                moveContinuityThread: (characterId, threadIndex, direction) =>
                    set((state) => ({
                        characters: state.characters.map((character) => {
                            if (character.id !== characterId) {
                                return character;
                            }

                            const targetIndex = threadIndex + direction;
                            if (
                                threadIndex < 0 ||
                                threadIndex >= character.continuity.openThreads.length ||
                                targetIndex < 0 ||
                                targetIndex >= character.continuity.openThreads.length
                            ) {
                                return character;
                            }

                            const nextThreads = [...character.continuity.openThreads];
                            const [movedThread] = nextThreads.splice(threadIndex, 1);
                            nextThreads.splice(targetIndex, 0, movedThread);

                            return {
                                ...character,
                                continuity: {
                                    ...character.continuity,
                                    openThreads: nextThreads,
                                },
                                updatedAt: Date.now(),
                            };
                        }),
                    })),

                markCharacterVisited: (characterId, visitedAt = Date.now()) =>
                    set((state) => ({
                        characters: state.characters.map((character) =>
                            character.id === characterId
                                ? {
                                      ...character,
                                      lastVisitedAt: visitedAt,
                                  }
                                : character
                        ),
                    })),

                // Connection actions
                setConnectionStatus: (status) => set({ connectionStatus: status }),
                setConnectionMessage: (message) => set({ connectionMessage: message }),
                setLmStudioEndpoint: (endpoint) => set({ lmStudioEndpoint: endpoint }),
                setSelectedModelId: (modelId) => set({ selectedModelId: modelId }),
                setDetectedServerMode: (mode) => set({ detectedServerMode: mode }),
                setAvailableModels: (models) => set({ availableModels: models }),

                // Image param actions
                setImageSteps: (v) => set({ imageSteps: v }),
                setImageCfgScale: (v) => set({ imageCfgScale: v }),
                setImageClipStopAtLayer: (v) => set({ imageClipStopAtLayer: v }),
                setImageModelId: (id) => set({ imageModelId: id }),
                setChatTemperature: (v) => set({ chatTemperature: v }),
                setChatMaxTokens: (v) => set({ chatMaxTokens: v }),
                setImageDimensions: (width, height) => set({ imageWidth: width, imageHeight: height }),

                // Portrait action
                setGeneratingPortraitForId: (id) => set({ generatingPortraitForId: id }),

                // Derived
                getActiveCharacter: () => {
                    const { characters, activeCharacterId } = get();
                    const character = characters.find((c) => c.id === activeCharacterId);
                    return character ? normalizeCharacter(character) : null;
                },

                getActiveConversation: () => {
                    const { conversations, activeCharacterId } = get();
                    if (!activeCharacterId) return [];
                    return conversations[activeCharacterId] ?? [];
                },
            }),
            {
                name: 'swarmui-roleplay-v1',
                version: 7,
                migrate: (persistedState) => {
                    const state = persistedState as Partial<RoleplayStoreState> & {
                        characters?: LegacyRoleplayCharacter[];
                    };

                    if (!Array.isArray(state.characters)) {
                        return state;
                    }

                    return {
                        ...state,
                        characters: state.characters.map((character) => normalizeCharacter(character)),
                    } as any;
                },
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
                    chatTemperature: state.chatTemperature,
                    chatMaxTokens: state.chatMaxTokens,
                    imageWidth: state.imageWidth,
                    imageHeight: state.imageHeight,
                }),
            }
        ),
        { name: 'RoleplayStore' }
    )
);
