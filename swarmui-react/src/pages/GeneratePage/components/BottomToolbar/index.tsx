import { memo } from 'react';
import {
    Box,
    Group,
} from '@mantine/core';
import { IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams, Model, LoRASelection } from '../../../../api/types';
import { SwarmActionIcon } from '../../../../components/ui';

import { ModelPanel } from './ModelPanel';
import { LoRAPanel } from './LoRAPanel';
import { EmbeddingPanel } from './EmbeddingPanel';
import { WildcardPanel } from './WildcardPanel';

export interface BottomToolbarProps {
    // Form
    form: UseFormReturnType<GenerateParams>;

    // Panel state
    collapsed: boolean;
    onToggleCollapse: () => void;
    panelSize: number;
    isResizing: boolean;

    // Model data
    models: Model[];
    loadingModels: boolean;
    loadingModel: boolean;
    modelLoadProgress: number;
    modelLoadingCount: number;
    modelLoadProgressEstimated: boolean;
    modelLoadError: string | null;
    onModelSelect: (modelName: string | null) => void;
    onRefreshModels: () => void;
    onOpenModelBrowser: () => void;

    // LoRA data
    activeLoras: LoRASelection[];
    onOpenLoraBrowser: () => void;

    // Embedding data
    embeddingOptions: { value: string; label: string }[];
    onOpenEmbeddingBrowser: () => void;

    // Wildcard data
    wildcardOptions: { value: string; label: string }[];
    wildcardText: string;
    onWildcardTextChange: (text: string) => void;
}

/**
 * Bottom toolbar containing Model, LoRA, Embedding, and Wildcard panels.
 * Collapsible and resizable.
 */
export const BottomToolbar = memo(function BottomToolbar({
    form,
    collapsed,
    onToggleCollapse,
    panelSize,
    isResizing,
    models = [],
    loadingModels,
    loadingModel,
    modelLoadProgress,
    modelLoadingCount,
    modelLoadProgressEstimated,
    modelLoadError,
    onModelSelect,
    onRefreshModels,
    onOpenModelBrowser,
    activeLoras = [],
    onOpenLoraBrowser,
    embeddingOptions = [],
    onOpenEmbeddingBrowser,
    wildcardOptions = [],
    wildcardText,
    onWildcardTextChange,
}: BottomToolbarProps) {
    return (
        <Box
            style={{
                flex: collapsed ? '0 0 40px' : `0 0 ${panelSize}px`,
                minHeight: collapsed ? 40 : panelSize,
                maxHeight: collapsed ? 40 : panelSize,
                width: '100%',
                backgroundColor: 'var(--mantine-color-invokeGray-8)',
                borderTop: 'none',
                transition: isResizing
                    ? 'none'
                    : 'flex 250ms cubic-bezier(0.16, 1, 0.3, 1), min-height 250ms cubic-bezier(0.16, 1, 0.3, 1), max-height 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'visible',
                position: 'relative',
            }}
        >
            {/* Collapse/Expand Button */}
            <SwarmActionIcon
                style={{
                    position: 'absolute',
                    top: -12,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 10,
                }}
                size="sm"
                tone="secondary"
                emphasis="soft"
                label={collapsed ? 'Expand bottom toolbar' : 'Collapse bottom toolbar'}
                onClick={onToggleCollapse}
            >
                {collapsed ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </SwarmActionIcon>

            {!collapsed && (
                <Box p="md" h="100%">
                    <Group h="100%" align="flex-start" gap="md">
                        <ModelPanel
                            form={form}
                            models={models}
                            loadingModels={loadingModels}
                            loadingModel={loadingModel}
                            modelLoadProgress={modelLoadProgress}
                            modelLoadingCount={modelLoadingCount}
                            modelLoadProgressEstimated={modelLoadProgressEstimated}
                            modelLoadError={modelLoadError}
                            onModelSelect={onModelSelect}
                            onRefresh={onRefreshModels}
                            onOpenBrowser={onOpenModelBrowser}
                        />

                        <LoRAPanel
                            activeLoras={activeLoras}
                            onOpenBrowser={onOpenLoraBrowser}
                        />

                        <EmbeddingPanel
                            form={form}
                            embeddingOptions={embeddingOptions}
                            onOpenBrowser={onOpenEmbeddingBrowser}
                        />

                        <WildcardPanel
                            form={form}
                            wildcardOptions={wildcardOptions}
                            wildcardText={wildcardText}
                            onWildcardTextChange={onWildcardTextChange}
                        />
                    </Group>
                </Box>
            )}
        </Box>
    );
});

// Re-export sub-components
export { ModelPanel } from './ModelPanel';
export { LoRAPanel } from './LoRAPanel';
export { EmbeddingPanel } from './EmbeddingPanel';
export { WildcardPanel } from './WildcardPanel';
