import { Modal, Stack, Text, Code, ScrollArea } from '@mantine/core';
import type { CompiledRoleplayPrompt } from '../../features/roleplay/roleplayPromptCompiler';

interface PromptInspectorModalProps {
    opened: boolean;
    onClose: () => void;
    compiledPrompt: CompiledRoleplayPrompt | null;
}

/**
 * Modal that shows the compiled prompt being sent to the LLM.
 * Useful for debugging and understanding what the AI sees.
 */
export function PromptInspectorModal({ opened, onClose, compiledPrompt }: PromptInspectorModalProps) {
    return (
        <Modal opened={opened} onClose={onClose} title="Prompt Inspector" size="xl">
            <Stack gap="md">
                <Text size="sm" fw={600}>System Prompt</Text>
                <ScrollArea h={200}>
                    <Code block style={{ whiteSpace: 'pre-wrap' }}>
                        {compiledPrompt?.systemPrompt ?? '(no prompt compiled)'}
                    </Code>
                </ScrollArea>

                <Text size="sm" fw={600}>
                    Message History ({compiledPrompt?.messages.length ?? 0} messages)
                </Text>
                <ScrollArea h={300}>
                    <Stack gap="xs">
                        {compiledPrompt?.messages.map((msg, i) => (
                            <div key={i}>
                                <Text size="xs" fw={600} c={msg.role === 'user' ? 'blue' : 'green'}>
                                    [{msg.role}]
                                </Text>
                                <Code block style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
                                    {msg.content}
                                </Code>
                            </div>
                        )) ?? (
                            <Text size="xs" c="dimmed">No messages to display.</Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Stack>
        </Modal>
    );
}
