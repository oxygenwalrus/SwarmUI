export interface RoleplayCharacter {
    id: string;
    name: string;
    avatar: string | null;
    /** Visual description for consistent image generation: hair, eyes, clothing, art style, etc. */
    appearancePrompt: string | null;
    personality: string;
    systemPrompt: string;
    sceneSuggestionPrompt: string | null;
    /**
     * Optional LoRA model name for character consistency.
     * Passed as the `loras` SwarmUI param when generating scenes/portraits.
     * Example: "my_character_v1.safetensors"
     */
    characterLora: string | null;
    /** LoRA weight, 0.0–1.5. Defaults to 0.8. */
    characterLoraWeight: number;
    /**
     * Whether to use IP-Adapter FaceID for character face consistency in generated scenes.
     * Requires: (1) a portrait/avatar set on this character, (2) ComfyUI with the
     * ComfyUI-IPAdapter-plus node pack and ip-adapter-faceid-plusv2_sdxl model installed.
     * When enabled, the character avatar is sent as `promptimages` and SwarmUI's built-in
     * IP-Adapter workflow step handles the face embedding — no LoRA required.
     */
    ipAdapterEnabled: boolean;
    /**
     * IP-Adapter FaceID model preset.
     * "faceid plus v2" is recommended for SDXL. "faceid" for SD1.5.
     * Full list: "faceid" | "faceid plus v2" | "faceid portrait"
     */
    ipAdapterModel: string;
    /** IP-Adapter face identity weight. Range 0.5–1.5, default 1.0.
     *  Lower = more scene freedom, higher = stricter face match. */
    ipAdapterWeight: number;
    createdAt: number;
    updatedAt: number;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    sceneImageUrl: string | null;
    /**
     * Scene prompt extracted from a [SCENE: ...] tag in the AI's response.
     * Present until the suggestion is dismissed or a scene image is generated.
     */
    suggestedImagePrompt: string | null;
}

export type RoleplayConnectionState = 'idle' | 'connecting' | 'connected' | 'error';
