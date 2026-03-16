import { probeAssistantConnection } from './magicPromptService';
import type { AssistantServerMode } from '../types/assistant';

export { probeAssistantConnection };

/**
 * Parses and removes a [SCENE: prompt] tag from AI-generated text.
 * The AI is instructed to write these tags when it wants to suggest a scene image.
 */
export function parseSceneTag(text: string): { cleanText: string; scenePrompt: string | null } {
    const match = text.match(/\[SCENE:\s*([\s\S]*?)\]/i);
    if (match) {
        return {
            cleanText: text.replace(/\[SCENE:[\s\S]*?\]/i, '').trim(),
            scenePrompt: match[1].trim(),
        };
    }
    return { cleanText: text, scenePrompt: null };
}

function normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

interface StreamChatInput {
    endpointUrl: string;
    serverMode: AssistantServerMode;
    modelId: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    onToken: (token: string) => void;
    onDone: (fullText: string) => void;
    onError: (error: string) => void;
    signal?: AbortSignal;
}

interface SSEChunk {
    choices?: Array<{
        delta?: { content?: string };
        finish_reason?: string | null;
    }>;
}

async function parseSSEStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onToken: (token: string) => void,
    signal?: AbortSignal
): Promise<string> {
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
        if (signal?.aborted) {
            reader.cancel();
            break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed === 'data: [DONE]') {
                return fullText;
            }

            if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);
                try {
                    const chunk = JSON.parse(jsonStr) as SSEChunk;
                    const content = chunk.choices?.[0]?.delta?.content;
                    if (content) {
                        fullText += content;
                        onToken(content);
                    }
                } catch {
                    // Skip malformed JSON chunks
                }
            }
        }
    }

    return fullText;
}

export async function streamRoleplayChat(input: StreamChatInput): Promise<void> {
    const base = normalizeUrl(input.endpointUrl);
    const url = input.serverMode === 'legacy-lmstudio'
        ? `${base}/api/v1/chat`
        : `${base}/v1/chat/completions`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: input.modelId,
                messages: input.messages,
                temperature: 0.8,
                max_tokens: 2048,
                stream: true,
            }),
            signal: input.signal,
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            input.onError(`Server error ${response.status}: ${errText}`);
            return;
        }

        if (!response.body) {
            input.onError('Response body is not readable');
            return;
        }

        const reader = response.body.getReader();
        const fullText = await parseSSEStream(reader, input.onToken, input.signal);
        input.onDone(fullText);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            return;
        }
        input.onError(
            `Failed to reach chat server: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

export async function generateSceneDescription(input: {
    endpointUrl: string;
    serverMode: AssistantServerMode;
    modelId: string;
    conversationContext: string;
    sceneSuggestionPrompt: string;
}): Promise<{ success: boolean; description: string; error?: string }> {
    const base = normalizeUrl(input.endpointUrl);
    const url = input.serverMode === 'legacy-lmstudio'
        ? `${base}/api/v1/chat`
        : `${base}/v1/chat/completions`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: input.modelId,
                messages: [
                    { role: 'system', content: input.sceneSuggestionPrompt },
                    { role: 'user', content: input.conversationContext },
                ],
                temperature: 0.7,
                max_tokens: 200,
            }),
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);
            return { success: false, description: '', error: `Server error ${response.status}: ${errText}` };
        }

        const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
        };

        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) {
            return { success: false, description: '', error: 'Empty response from server' };
        }

        return { success: true, description: content };
    } catch (error) {
        return {
            success: false,
            description: '',
            error: `Failed to reach server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
