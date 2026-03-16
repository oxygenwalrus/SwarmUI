/**
 * usePanelState Hook - Refactored to use layoutStore
 * 
 * This hook now uses the centralized layoutStore for panel state,
 * which persists across tab switches (but resets on browser refresh).
 */
import { useCallback } from 'react';
import { useResizablePanel } from '../../../hooks/useResizablePanel';
import {
    useLeftPanel,
    useRightPanel,
    useBottomPanel,
    useLayoutActions,
    DEFAULT_PANEL_CONFIG,
} from '../../../stores/layoutStore';

/**
 * Configuration for panel sizes and constraints.
 */
export interface PanelConfig {
    initialSize: number;
    minSize: number;
    maxSize: number;
}

// Re-export default config for backwards compatibility
export { DEFAULT_PANEL_CONFIG };

/**
 * Hook for managing panel collapse/expand and resize state.
 * Now uses the centralized layoutStore for persistence across tab switches.
 */
export function usePanelState(config: {
    left?: Partial<PanelConfig>;
    right?: Partial<PanelConfig>;
    bottom?: Partial<PanelConfig>;
} = {}) {
    // Merge configs with defaults
    const leftConfig = { ...DEFAULT_PANEL_CONFIG.left, ...config.left };
    const rightConfig = { ...DEFAULT_PANEL_CONFIG.right, ...config.right };
    const bottomConfig = { ...DEFAULT_PANEL_CONFIG.bottom, ...config.bottom };

    // Panel state from store (persists across tab switches)
    const leftPanelState = useLeftPanel();
    const rightPanelState = useRightPanel();
    const bottomPanelState = useBottomPanel();
    const layoutActions = useLayoutActions();

    // Resizable panel hooks - these handle the drag interactions
    // We initialize them with the stored sizes
    const leftPanel = useResizablePanel({
        initialSize: leftPanelState.size,
        minSize: leftConfig.minSize,
        maxSize: leftConfig.maxSize,
        direction: 'horizontal',
        onResize: leftPanelState.setSize,
    });

    const rightPanel = useResizablePanel({
        initialSize: rightPanelState.size,
        minSize: rightConfig.minSize,
        maxSize: rightConfig.maxSize,
        direction: 'horizontal',
        onResize: rightPanelState.setSize,
    });

    const bottomPanel = useResizablePanel({
        initialSize: bottomPanelState.size,
        minSize: bottomConfig.minSize,
        maxSize: bottomConfig.maxSize,
        direction: 'vertical',
        onResize: bottomPanelState.setSize,
    });

    // Toggle functions - use store actions
    const toggleLeftPanel = useCallback(() => {
        leftPanelState.toggle();
    }, [leftPanelState]);

    const toggleRightPanel = useCallback(() => {
        rightPanelState.toggle();
    }, [rightPanelState]);

    const toggleBottomPanel = useCallback(() => {
        bottomPanelState.toggle();
    }, [bottomPanelState]);

    return {
        // Left panel
        leftPanelCollapsed: leftPanelState.collapsed,
        setLeftPanelCollapsed: leftPanelState.setCollapsed,
        toggleLeftPanel,
        leftPanel: {
            ...leftPanel,
            size: leftPanelState.size, // Use stored size for rendering
        },

        // Right panel
        rightPanelCollapsed: rightPanelState.collapsed,
        setRightPanelCollapsed: rightPanelState.setCollapsed,
        toggleRightPanel,
        rightPanel: {
            ...rightPanel,
            size: rightPanelState.size, // Use stored size for rendering
        },

        // Bottom panel
        bottomPanelCollapsed: bottomPanelState.collapsed,
        setBottomPanelCollapsed: bottomPanelState.setCollapsed,
        toggleBottomPanel,
        bottomPanel: {
            ...bottomPanel,
            size: bottomPanelState.size, // Use stored size for rendering
        },

        // Utility functions from store
        expandAllPanels: layoutActions.expandAllPanels,
        collapseAllPanels: layoutActions.collapseAllPanels,
        enterFocusMode: layoutActions.enterFocusMode,
        exitFocusMode: layoutActions.exitFocusMode,
        resetLayout: layoutActions.resetLayout,
    };
}

export type PanelState = ReturnType<typeof usePanelState>;
