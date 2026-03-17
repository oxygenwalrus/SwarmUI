import { useState, useCallback } from 'react';

/**
 * Hook for managing all modal/drawer open/close state in GeneratePage.
 * Consolidates modal state management into a single hook.
 */
export function useModalState() {
    // LoRA Browser modal
    const [loraModalOpened, setLoraModalOpened] = useState(false);

    // Model Browser modal
    const [modelBrowserOpened, setModelBrowserOpened] = useState(false);

    // Embedding Browser modal
    const [embeddingModalOpened, setEmbeddingModalOpened] = useState(false);

    // History Drawer
    const [historyDrawerOpened, setHistoryDrawerOpened] = useState(false);

    // Schedule/Queue Job modal
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

    // Save Preset modal
    const [savePresetModal, setSavePresetModal] = useState(false);

    // Keyboard Shortcuts modal
    const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

    // Convenience toggle functions
    const openLoraModal = useCallback(() => setLoraModalOpened(true), []);
    const closeLoraModal = useCallback(() => setLoraModalOpened(false), []);
    const toggleLoraModal = useCallback(() => setLoraModalOpened(prev => !prev), []);

    const openModelBrowser = useCallback(() => setModelBrowserOpened(true), []);
    const closeModelBrowser = useCallback(() => setModelBrowserOpened(false), []);
    const toggleModelBrowser = useCallback(() => setModelBrowserOpened(prev => !prev), []);

    const openEmbeddingModal = useCallback(() => setEmbeddingModalOpened(true), []);
    const closeEmbeddingModal = useCallback(() => setEmbeddingModalOpened(false), []);
    const toggleEmbeddingModal = useCallback(() => setEmbeddingModalOpened(prev => !prev), []);

    const openHistoryDrawer = useCallback(() => setHistoryDrawerOpened(true), []);
    const closeHistoryDrawer = useCallback(() => setHistoryDrawerOpened(false), []);
    const toggleHistoryDrawer = useCallback(() => setHistoryDrawerOpened(prev => !prev), []);

    const openScheduleModal = useCallback(() => setScheduleModalOpen(true), []);
    const closeScheduleModal = useCallback(() => setScheduleModalOpen(false), []);
    const toggleScheduleModal = useCallback(() => setScheduleModalOpen(prev => !prev), []);

    const openSavePresetModal = useCallback(() => setSavePresetModal(true), []);
    const closeSavePresetModal = useCallback(() => setSavePresetModal(false), []);
    const toggleSavePresetModal = useCallback(() => setSavePresetModal(prev => !prev), []);

    const openShortcutsModal = useCallback(() => setShortcutsModalOpen(true), []);
    const closeShortcutsModal = useCallback(() => setShortcutsModalOpen(false), []);
    const toggleShortcutsModal = useCallback(() => setShortcutsModalOpen(prev => !prev), []);

    // Close all modals (useful for cleanup)
    const closeAllModals = useCallback(() => {
        setLoraModalOpened(false);
        setModelBrowserOpened(false);
        setEmbeddingModalOpened(false);
        setHistoryDrawerOpened(false);
        setScheduleModalOpen(false);
        setSavePresetModal(false);
        setShortcutsModalOpen(false);
    }, []);

    return {
        // LoRA Modal
        loraModalOpened,
        setLoraModalOpened,
        openLoraModal,
        closeLoraModal,
        toggleLoraModal,

        // Model Browser
        modelBrowserOpened,
        setModelBrowserOpened,
        openModelBrowser,
        closeModelBrowser,
        toggleModelBrowser,

        // Embedding Modal
        embeddingModalOpened,
        setEmbeddingModalOpened,
        openEmbeddingModal,
        closeEmbeddingModal,
        toggleEmbeddingModal,

        // History Drawer
        historyDrawerOpened,
        setHistoryDrawerOpened,
        openHistoryDrawer,
        closeHistoryDrawer,
        toggleHistoryDrawer,

        // Schedule Modal
        scheduleModalOpen,
        setScheduleModalOpen,
        openScheduleModal,
        closeScheduleModal,
        toggleScheduleModal,

        // Save Preset Modal
        savePresetModal,
        setSavePresetModal,
        openSavePresetModal,
        closeSavePresetModal,
        toggleSavePresetModal,

        // Shortcuts Modal
        shortcutsModalOpen,
        setShortcutsModalOpen,
        openShortcutsModal,
        closeShortcutsModal,
        toggleShortcutsModal,

        // Utility
        closeAllModals,
    };
}

export type ModalState = ReturnType<typeof useModalState>;
