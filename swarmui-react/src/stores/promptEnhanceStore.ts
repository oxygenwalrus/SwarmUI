import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { AssistantConnectionStatus, AssistantServerMode } from '../types/assistant';

const DEFAULT_SYSTEM_PROMPT =
  'You are an expert at writing prompts for Stable Diffusion image generation. ' +
  'Take the user\'s prompt and enhance it with more descriptive detail, artistic style references, ' +
  'lighting, composition, and quality tags. Return ONLY the enhanced prompt text, nothing else.';

const DEFAULT_ASSISTANT_SYSTEM_PROMPT =
  'You are a prompt-writing copilot for image generation. ' +
  'Help the user refine their idea, write stronger positive and negative prompts, and suggest safe generation settings. ' +
  'Keep suggestions grounded in the current model and prompt context.';

export type PromptPresetKey = 'sd' | 'illustrious' | 'pony' | 'flux' | 'zimage';

export interface PromptStylePreset {
  key: PromptPresetKey;
  label: string;
  systemPrompt: string;
}

export const PROMPT_STYLE_PRESETS: PromptStylePreset[] = [
  {
    key: 'sd',
    label: 'SD / SDXL',
    systemPrompt:
      'You are an expert at writing prompts for Stable Diffusion and SDXL models. ' +
      'Enhance the prompt with vivid descriptive detail, artistic style references (e.g. "oil painting", "digital art", "photograph"), ' +
      'lighting descriptions, composition guidance, and quality boosters like "masterpiece, best quality, highly detailed". ' +
      'Use comma-separated tags and natural language. Return ONLY the enhanced prompt text, nothing else.',
  },
  {
    key: 'illustrious',
    label: 'Illustrious',
    systemPrompt:
      'You are an expert at writing prompts for Illustrious XL models which excel at anime and illustration styles. ' +
      'Enhance the prompt using Danbooru/Booru-style tags mixed with natural language. ' +
      'Include character details, art style tags (e.g. "anime coloring", "flat color", "cel shading"), ' +
      'quality tags like "masterpiece, best quality, absurdres", and composition details. ' +
      'Illustrious models understand both tag-based and natural language prompts well. Return ONLY the enhanced prompt text, nothing else.',
  },
  {
    key: 'pony',
    label: 'Pony',
    systemPrompt:
      'You are an expert at writing prompts for Pony Diffusion models. ' +
      'Enhance the prompt using the Pony score prefix format: "score_9, score_8_up, score_7_up, score_6_up, score_5_up, score_4_up, " ' +
      'followed by descriptive Booru-style tags. Include source tags like "source_anime" or "source_cartoon" where appropriate. ' +
      'Add detailed character descriptions, art style, and composition tags. ' +
      'Return ONLY the enhanced prompt text, nothing else.',
  },
  {
    key: 'flux',
    label: 'Flux',
    systemPrompt:
      'You are an expert at writing prompts for Flux image generation models (by Black Forest Labs). ' +
      'Flux models work best with detailed natural language descriptions rather than tag-based prompts. ' +
      'Write flowing, descriptive sentences covering subject, scene, mood, lighting, camera angle, and artistic style. ' +
      'Flux handles long, detailed prompts very well. Avoid Booru tags and comma-separated keywords. ' +
      'Return ONLY the enhanced prompt text, nothing else.',
  },
  {
    key: 'zimage',
    label: 'Z Image',
    systemPrompt:
      'You are an expert at writing prompts for Z Image models. ' +
      'Enhance the prompt with detailed natural language descriptions combined with quality tags. ' +
      'Include subject details, environment, lighting, mood, artistic style, and camera perspective. ' +
      'Use a mix of descriptive prose and comma-separated quality modifiers. ' +
      'Return ONLY the enhanced prompt text, nothing else.',
  },
];

interface PromptEnhanceState {
  enabled: boolean;
  endpointUrl: string;
  modelId: string;
  detectedServerMode: AssistantServerMode | null;
  connectionStatus: AssistantConnectionStatus['state'];
  connectionMessage: string | null;
  availableModels: { id: string; name: string }[];
  lastSuccessfulModelId: string;
  systemPrompt: string;
  assistantSystemPrompt: string;
  activePresetKey: PromptPresetKey | null;
  isEnhancing: boolean;
  lastError: string | null;
}

interface PromptEnhanceActions {
  setEnabled: (enabled: boolean) => void;
  setEndpointUrl: (url: string) => void;
  setModelId: (modelId: string) => void;
  setDetectedServerMode: (mode: AssistantServerMode | null) => void;
  setConnectionState: (input: {
    status: AssistantConnectionStatus['state'];
    message: string | null;
    availableModels?: { id: string; name: string }[];
    detectedServerMode?: AssistantServerMode | null;
  }) => void;
  setAvailableModels: (models: { id: string; name: string }[]) => void;
  setLastSuccessfulModelId: (modelId: string) => void;
  setSystemPrompt: (systemPrompt: string) => void;
  setAssistantSystemPrompt: (systemPrompt: string) => void;
  setActivePresetKey: (key: PromptPresetKey | null) => void;
  applyPreset: (key: PromptPresetKey) => void;
  setEnhancing: (isEnhancing: boolean) => void;
  setLastError: (error: string | null) => void;
}

export const usePromptEnhanceStore = create<PromptEnhanceState & PromptEnhanceActions>()(
  devtools(
    persist(
      (set) => ({
        enabled: false,
        endpointUrl: 'http://localhost:1234',
        modelId: '',
        detectedServerMode: null,
        connectionStatus: 'idle',
        connectionMessage: null,
        availableModels: [],
        lastSuccessfulModelId: '',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        assistantSystemPrompt: DEFAULT_ASSISTANT_SYSTEM_PROMPT,
        activePresetKey: null,
        isEnhancing: false,
        lastError: null,

        setEnabled: (enabled) => set({ enabled }),
        setEndpointUrl: (endpointUrl) => set({
          endpointUrl,
          modelId: '',
          detectedServerMode: null,
          connectionStatus: 'idle',
          connectionMessage: null,
          availableModels: [],
        }),
        setModelId: (modelId) => set({ modelId }),
        setDetectedServerMode: (detectedServerMode) => set({ detectedServerMode }),
        setConnectionState: ({ status, message, availableModels, detectedServerMode }) =>
          set((state) => ({
            connectionStatus: status,
            connectionMessage: message,
            availableModels: availableModels ?? state.availableModels,
            detectedServerMode: detectedServerMode === undefined ? state.detectedServerMode : detectedServerMode,
          })),
        setAvailableModels: (availableModels) => set({ availableModels }),
        setLastSuccessfulModelId: (lastSuccessfulModelId) => set({ lastSuccessfulModelId }),
        setSystemPrompt: (systemPrompt) => set({ systemPrompt, activePresetKey: null }),
        setAssistantSystemPrompt: (assistantSystemPrompt) => set({ assistantSystemPrompt }),
        setActivePresetKey: (key) => set({ activePresetKey: key }),
        applyPreset: (key) => {
          const preset = PROMPT_STYLE_PRESETS.find((p) => p.key === key);
          if (preset) {
            set({ systemPrompt: preset.systemPrompt, activePresetKey: key });
          }
        },
        setEnhancing: (isEnhancing) => set({ isEnhancing }),
        setLastError: (lastError) => set({ lastError }),
      }),
      {
        name: 'swarmui-prompt-enhance',
        partialize: (state) => ({
          enabled: state.enabled,
          endpointUrl: state.endpointUrl,
          modelId: state.modelId,
          detectedServerMode: state.detectedServerMode,
          connectionStatus: state.connectionStatus,
          connectionMessage: state.connectionMessage,
          availableModels: state.availableModels,
          lastSuccessfulModelId: state.lastSuccessfulModelId,
          systemPrompt: state.systemPrompt,
          assistantSystemPrompt: state.assistantSystemPrompt,
          activePresetKey: state.activePresetKey,
        }),
      }
    ),
    { name: 'PromptEnhanceStore' }
  )
);

export { DEFAULT_ASSISTANT_SYSTEM_PROMPT, DEFAULT_SYSTEM_PROMPT };
