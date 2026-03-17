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
    onServerModeCorrection?: (mode: AssistantServerMode) => void;
    signal?: AbortSignal;
    temperature?: number;
    maxTokens?: number;
}

interface SSEChunk {
    choices?: Array<{
        delta?: { content?: string };
        finish_reason?: string | null;
    }>;
}

function getChatUrl(base: string, serverMode: AssistantServerMode): string {
    if (serverMode === 'legacy-lmstudio') return `${base}/api/v1/chat`;
    if (serverMode === 'openai-responses') return `${base}/v1/responses`;
    return `${base}/v1/chat/completions`;
}

function buildChatBody(
    serverMode: AssistantServerMode,
    modelId: string,
    messages: Array<{ role: string; content: string }>,
    options: { temperature?: number; max_tokens?: number; stream?: boolean } = {}
): string {
    const { temperature = 0.8, max_tokens = 2048, stream = true } = options;

    if (serverMode === 'openai-responses') {
        return JSON.stringify({
            model: modelId,
            input: messages,
            temperature,
            max_output_tokens: max_tokens,
            stream,
        });
    }

    return JSON.stringify({
        model: modelId,
        messages,
        temperature,
        max_tokens,
        stream,
    });
}

/**
 * Checks if a 400 error response indicates the server wants the Responses API
 * format (uses 'input' instead of 'messages').
 */
function isInputRequiredError(errorText: string): boolean {
    try {
        const parsed = JSON.parse(errorText);
        return parsed?.error?.param === 'input' && parsed?.error?.message?.includes("'input' is required");
    } catch {
        return errorText.includes("'input' is required");
    }
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

/**
 * Parses SSE stream from the OpenAI Responses API format.
 * Events use `response.output_text.delta` with a `delta` field.
 */
async function parseResponsesAPIStream(
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
        buffer = lines.pop() ?? '';

        let currentEvent = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                currentEvent = '';
                continue;
            }

            if (trimmed.startsWith('event: ')) {
                currentEvent = trimmed.slice(7);
                continue;
            }

            if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.slice(6);

                // End of stream
                if (currentEvent === 'response.completed' || currentEvent === 'response.done') {
                    return fullText;
                }

                try {
                    const data = JSON.parse(jsonStr) as Record<string, unknown>;

                    // Handle response.output_text.delta events
                    if (
                        currentEvent === 'response.output_text.delta' ||
                        data.type === 'response.output_text.delta'
                    ) {
                        const delta = data.delta as string | undefined;
                        if (delta) {
                            fullText += delta;
                            onToken(delta);
                        }
                    }

                    // Also handle content_part delta format (some servers)
                    if (
                        currentEvent === 'response.content_part.delta' ||
                        data.type === 'response.content_part.delta'
                    ) {
                        const delta = data.delta as string | undefined;
                        if (delta) {
                            fullText += delta;
                            onToken(delta);
                        }
                    }

                    // Fallback: check for chat-completions-style delta in the data
                    const choices = (data as SSEChunk).choices;
                    if (choices?.[0]?.delta?.content) {
                        const content = choices[0].delta.content;
                        fullText += content;
                        onToken(content);
                    }
                } catch {
                    // Skip malformed JSON
                }
            }
        }
    }

    return fullText;
}

async function doStreamRequest(
    url: string,
    body: string,
    serverMode: AssistantServerMode,
    input: StreamChatInput
): Promise<{ ok: true } | { ok: false; status: number; errorText: string }> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: input.signal,
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        return { ok: false, status: response.status, errorText: errText };
    }

    if (!response.body) {
        input.onError('Response body is not readable');
        return { ok: true };
    }

    const reader = response.body.getReader();
    const parser = serverMode === 'openai-responses' ? parseResponsesAPIStream : parseSSEStream;
    const fullText = await parser(reader, input.onToken, input.signal);
    input.onDone(fullText);
    return { ok: true };
}

export async function streamRoleplayChat(input: StreamChatInput): Promise<void> {
    const base = normalizeUrl(input.endpointUrl);

    try {
        const url = getChatUrl(base, input.serverMode);
        const body = buildChatBody(input.serverMode, input.modelId, input.messages, {
            temperature: input.temperature,
            max_tokens: input.maxTokens,
        });

        const result = await doStreamRequest(url, body, input.serverMode, input);

        if (!result.ok) {
            // If server returned 400 asking for 'input', auto-retry with Responses API format
            if (
                result.status === 400 &&
                input.serverMode !== 'openai-responses' &&
                isInputRequiredError(result.errorText)
            ) {
                const retryUrl = getChatUrl(base, 'openai-responses');
                const retryBody = buildChatBody('openai-responses', input.modelId, input.messages, {
                    temperature: input.temperature,
                    max_tokens: input.maxTokens,
                });
                const retryResult = await doStreamRequest(retryUrl, retryBody, 'openai-responses', input);

                if (retryResult.ok) {
                    // Notify caller to update stored server mode
                    input.onServerModeCorrection?.('openai-responses');
                    return;
                }

                // Retry also failed — report the retry error
                if (!retryResult.ok) {
                    input.onError(`Server error ${retryResult.status}: ${retryResult.errorText}`);
                    return;
                }
            }

            input.onError(`Server error ${result.status}: ${result.errorText}`);
        }
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
    const url = getChatUrl(base, input.serverMode);

    const messages = [
        { role: 'system', content: input.sceneSuggestionPrompt },
        { role: 'user', content: input.conversationContext },
    ];

    const body = buildChatBody(input.serverMode, input.modelId, messages, {
        temperature: 0.7,
        max_tokens: 200,
        stream: false,
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => response.statusText);

            // Auto-retry with Responses API if needed
            if (response.status === 400 && input.serverMode !== 'openai-responses' && isInputRequiredError(errText)) {
                const retryUrl = getChatUrl(base, 'openai-responses');
                const retryBody = buildChatBody('openai-responses', input.modelId, messages, {
                    temperature: 0.7,
                    max_tokens: 200,
                    stream: false,
                });
                const retryResponse = await fetch(retryUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: retryBody,
                });

                if (retryResponse.ok) {
                    return extractSceneFromResponse(retryResponse, input.serverMode);
                }

                const retryErr = await retryResponse.text().catch(() => retryResponse.statusText);
                return { success: false, description: '', error: `Server error ${retryResponse.status}: ${retryErr}` };
            }

            return { success: false, description: '', error: `Server error ${response.status}: ${errText}` };
        }

        return extractSceneFromResponse(response, input.serverMode);
    } catch (error) {
        return {
            success: false,
            description: '',
            error: `Failed to reach server: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

async function extractSceneFromResponse(
    response: Response,
    serverMode: AssistantServerMode
): Promise<{ success: boolean; description: string; error?: string }> {
    const data = await response.json();

    let content: string | undefined;

    if (serverMode === 'openai-responses') {
        // Responses API format: { output: [{ content: [{ text: "..." }] }] }
        const output = (data as Record<string, unknown>).output;
        if (Array.isArray(output)) {
            for (const item of output) {
                const itemContent = (item as Record<string, unknown>).content;
                if (Array.isArray(itemContent)) {
                    for (const part of itemContent) {
                        const text = (part as Record<string, unknown>).text;
                        if (typeof text === 'string') {
                            content = text.trim();
                            break;
                        }
                    }
                }
                if (content) break;
            }
        }
    } else {
        // Chat Completions format
        const choices = (data as { choices?: Array<{ message?: { content?: string } }> }).choices;
        content = choices?.[0]?.message?.content?.trim();
    }

    if (!content) {
        return { success: false, description: '', error: 'Empty response from server' };
    }

    return { success: true, description: content };
}
