import { useEffect, useCallback, useRef, useState } from 'react';
import { Group } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconTheater } from '@tabler/icons-react';
import { useShallow } from 'zustand/react/shallow';
import { PageScaffold } from '../../components/layout/PageScaffold';
import { SectionHero } from '../../components/ui/SectionHero';
import { SwarmButton } from '../../components/ui/SwarmButton';
import { ResizeHandle } from '../../components/ui/ResizeHandle';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { useRoleplayStore } from '../../stores/roleplayStore';
import { probeAssistantConnection } from '../../services/roleplayChatService';
import { CharacterSidebar } from './CharacterSidebar';
import { ChatPanel } from './ChatPanel';
import { ScenePanel } from './ScenePanel';

export function RoleplayPage() {
    const isWide = useMediaQuery('(min-width: 1366px)', true);
    const [scenePanelOpen, setScenePanelOpen] = useState(false);
    const generateSceneRef = useRef<(() => void) | null>(null);
    const generateSceneWithPromptRef = useRef<((prompt: string) => void) | null>(null);

    const {
        connectionStatus,
        lmStudioEndpoint,
        setConnectionStatus,
        setConnectionMessage,
        setDetectedServerMode,
        setAvailableModels,
        setSelectedModelId,
        selectedModelId,
    } = useRoleplayStore(
        useShallow((s) => ({
            connectionStatus: s.connectionStatus,
            lmStudioEndpoint: s.lmStudioEndpoint,
            setConnectionStatus: s.setConnectionStatus,
            setConnectionMessage: s.setConnectionMessage,
            setDetectedServerMode: s.setDetectedServerMode,
            setAvailableModels: s.setAvailableModels,
            setSelectedModelId: s.setSelectedModelId,
            selectedModelId: s.selectedModelId,
        }))
    );

    const sidebar = useResizablePanel({
        initialSize: 260,
        minSize: 200,
        maxSize: 400,
        direction: 'horizontal',
    });

    const probeConnection = useCallback(async () => {
        setConnectionStatus('connecting');
        setConnectionMessage('Connecting...');

        const result = await probeAssistantConnection(lmStudioEndpoint);

        if (result.ok) {
            setConnectionStatus('connected');
            setConnectionMessage(result.connection.message);
            setDetectedServerMode(result.connection.serverMode);
            setAvailableModels(result.connection.models);
            if (!selectedModelId && result.connection.models.length > 0) {
                setSelectedModelId(result.connection.models[0].id);
            }
        } else {
            setConnectionStatus('error');
            setConnectionMessage(result.connection.message);
            setDetectedServerMode(null);
            setAvailableModels([]);
        }
    }, [
        lmStudioEndpoint,
        selectedModelId,
        setConnectionStatus,
        setConnectionMessage,
        setDetectedServerMode,
        setAvailableModels,
        setSelectedModelId,
    ]);

    useEffect(() => {
        probeConnection();
    }, [probeConnection]);

    const connectionBadge = {
        connected: { label: 'Connected', tone: 'success' as const },
        connecting: { label: 'Connecting...', tone: 'warning' as const },
        error: { label: 'Disconnected', tone: 'danger' as const },
        idle: { label: 'Not Connected', tone: 'secondary' as const },
    }[connectionStatus];

    return (
        <PageScaffold
            density="compact"
            header={
                <SectionHero
                    title="Roleplay"
                    subtitle="AI-powered character chat with scene generation"
                    icon={<IconTheater size={24} />}
                    badges={[
                        {
                            label: connectionBadge.label,
                            tone: connectionBadge.tone,
                            emphasis: 'solid',
                        },
                    ]}
                    rightSection={
                        <Group gap="xs">
                            <SwarmButton
                                tone="brand"
                                emphasis="ghost"
                                size="xs"
                                onClick={() => setScenePanelOpen(!scenePanelOpen)}
                            >
                                {scenePanelOpen ? 'Hide Scene' : 'Show Scene'}
                            </SwarmButton>
                        </Group>
                    }
                />
            }
        >
            <div
                style={{
                    display: 'flex',
                    height: 'var(--app-content-height, calc(100vh - 140px))',
                    overflow: 'hidden',
                }}
            >
                {/* Character Sidebar */}
                <div style={{ width: sidebar.size, flexShrink: 0, overflow: 'hidden' }}>
                    <CharacterSidebar onProbeConnection={probeConnection} />
                </div>

                <ResizeHandle
                    direction="horizontal"
                    onPointerDown={sidebar.handlePointerDown}
                    onNudge={sidebar.nudgeSize}
                    isResizing={sidebar.isResizing}
                />

                {/* Chat Panel */}
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <ChatPanel
                        onRegenerateScene={() => generateSceneRef.current?.()}
                        onGenerateSceneWithPrompt={(prompt) => generateSceneWithPromptRef.current?.(prompt)}
                    />
                </div>

                {/* Scene Panel */}
                {(scenePanelOpen || isWide) && (
                    <>
                        <div
                            style={{
                                width: 320,
                                flexShrink: 0,
                                overflow: 'hidden',
                                borderLeft: '1px solid var(--theme-gray-5)',
                            }}
                        >
                            <ScenePanel
                                onRegisterGenerate={(fn) => { generateSceneRef.current = fn; }}
                                onRegisterGenerateWithPrompt={(fn) => { generateSceneWithPromptRef.current = fn; }}
                            />
                        </div>
                    </>
                )}
            </div>
        </PageScaffold>
    );
}

export default RoleplayPage;
