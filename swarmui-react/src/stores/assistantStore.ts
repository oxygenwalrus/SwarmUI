import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
    AssistantChatTurn,
    AssistantConnectionStatus,
    AssistantResponseDraft,
} from '../types/assistant';

const emptyConnection = {
    state: 'idle',
    message: null,
    serverMode: null,
    endpointUrl: 'http://localhost:1234',
    models: [],
    lastCheckedAt: null,
} satisfies AssistantConnectionStatus;

interface AssistantStoreState {
    panelOpen: boolean;
    loading: boolean;
    error: string | null;
    selectedModelId: string;
    connection: AssistantConnectionStatus;
    conversation: AssistantChatTurn[];
    draft: AssistantResponseDraft | null;
    setPanelOpen: (open: boolean) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setSelectedModelId: (modelId: string) => void;
    setConnection: (connection: AssistantConnectionStatus) => void;
    addTurn: (turn: AssistantChatTurn) => void;
    replaceConversation: (conversation: AssistantChatTurn[]) => void;
    setDraft: (draft: AssistantResponseDraft | null) => void;
    clearConversation: () => void;
}

export const useAssistantStore = create<AssistantStoreState>()(
    devtools(
        (set) => ({
            panelOpen: false,
            loading: false,
            error: null,
            selectedModelId: '',
            connection: emptyConnection,
            conversation: [],
            draft: null,
            setPanelOpen: (panelOpen) => set({ panelOpen }),
            setLoading: (loading) => set({ loading }),
            setError: (error) => set({ error }),
            setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
            setConnection: (connection) => set({ connection }),
            addTurn: (turn) => set((state) => ({ conversation: [...state.conversation, turn] })),
            replaceConversation: (conversation) => set({ conversation }),
            setDraft: (draft) => set({ draft }),
            clearConversation: () => set({ conversation: [], draft: null, error: null }),
        }),
        { name: 'AssistantStore' }
    )
);
