import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { RoleplayCharacter, ChatMessage, RoleplayConnectionState } from '../types/roleplay';
import type { AssistantModel, AssistantServerMode } from '../types/assistant';

const SCENE_TAG_INSTRUCTION =
    '\n\nWhen a scene is vivid and worth illustrating — a dramatic location, a creature, ' +
    'a key moment — write [SCENE: detailed image generation prompt] on its own line. ' +
    'Make the image prompt specific: describe lighting, mood, style, subject, and composition.';

const DEFAULT_CHARACTERS: RoleplayCharacter[] = [
    {
        id: 'default-storyteller',
        name: 'Storyteller',
        avatar: null,
        appearancePrompt: null,
        characterLora: null,
        characterLoraWeight: 0.8,
        ipAdapterEnabled: false,
        ipAdapterModel: 'faceid plus v2',
        ipAdapterWeight: 1.0,
        personality: 'A creative narrator who builds immersive fantasy worlds.',
        systemPrompt:
            'You are a creative storyteller and dungeon master. You narrate scenes vividly, ' +
            "respond to the user's actions, and drive the story forward. Keep descriptions " +
            'atmospheric and concise. Always stay in character.' +
            SCENE_TAG_INSTRUCTION,
        sceneSuggestionPrompt:
            'Based on the conversation, describe the current visual scene in a single vivid sentence ' +
            'suitable as an image generation prompt. Focus on setting, lighting, and mood. ' +
            'Do not include character dialogue or actions.',
        createdAt: Date.now(),
        updatedAt: Date.now(),
    },
];

interface RoleplayStoreState {
    // Characters
    characters: RoleplayCharacter[];
    activeCharacterId: string | null;

    // Conversations (keyed by character ID)
    conversations: Record<string, ChatMessage[]>;

    // Scene image
    sceneImage: string | null;
    isGeneratingImage: boolean;

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
    clearConversation: (characterId: string) => void;
    setStreamingChat: (streaming: boolean) => void;
    setStreamingContent: (content: string) => void;
    appendStreamingContent: (token: string) => void;
    attachSceneImageToLastMessage: (characterId: string, imageUrl: string) => void;
    dismissSuggestion: (characterId: string, messageId: string) => void;

    // Actions - Scene
    setSceneImage: (url: string | null) => void;
    setGeneratingImage: (generating: boolean) => void;

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

                // Scene
                sceneImage: null,
                isGeneratingImage: false,

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

                // Portrait
                generatingPortraitForId: null,

                // Character actions
                addCharacter: (character) =>
                    set((state) => ({
                        characters: [...state.characters, character],
                    })),

                updateCharacter: (id, updates) =>
                    set((state) => ({
                        characters: state.characters.map((c) =>
                            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
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
                            c.id === id ? { ...c, avatar: avatarUrl, updatedAt: Date.now() } : c
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

                clearConversation: (characterId) =>
                    set((state) => ({
                        conversations: {
                            ...state.conversations,
                            [characterId]: [],
                        },
                        sceneImage: null,
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

                // Scene actions
                setSceneImage: (url) => set({ sceneImage: url }),
                setGeneratingImage: (generating) => set({ isGeneratingImage: generating }),

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

                // Portrait action
                setGeneratingPortraitForId: (id) => set({ generatingPortraitForId: id }),

                // Derived
                getActiveCharacter: () => {
                    const { characters, activeCharacterId } = get();
                    return characters.find((c) => c.id === activeCharacterId) ?? null;
                },

                getActiveConversation: () => {
                    const { conversations, activeCharacterId } = get();
                    if (!activeCharacterId) return [];
                    return conversations[activeCharacterId] ?? [];
                },
            }),
            {
                name: 'swarmui-roleplay-v1',
                version: 1,
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
                }),
            }
        ),
        { name: 'RoleplayStore' }
    )
);
