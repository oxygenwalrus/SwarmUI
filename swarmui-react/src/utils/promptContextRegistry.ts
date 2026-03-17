export type PromptContextAction = 'autocorrect-format' | 'grammar-check';

interface PromptTargetHandlers {
    onAutocorrectFormat: () => void;
    onGrammarCheck: () => void;
}

const targetHandlers = new Map<string, PromptTargetHandlers>();
let activeTargetId: string | null = null;
let promptActionListenerInitialized = false;

function isElectronNativeContextMenuEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    const bridge = window.electron;
    if (!bridge?.isDesktopNativeContextMenuEnabled) return false;
    try {
        return bridge.isDesktopNativeContextMenuEnabled();
    } catch {
        return false;
    }
}

function dispatchPromptAction(action: PromptContextAction): void {
    if (!activeTargetId) return;
    const handlers = targetHandlers.get(activeTargetId);
    if (!handlers) return;

    if (action === 'autocorrect-format') {
        handlers.onAutocorrectFormat();
        return;
    }
    if (action === 'grammar-check') {
        handlers.onGrammarCheck();
    }
}

function initPromptActionListener() {
    if (promptActionListenerInitialized) return;
    promptActionListenerInitialized = true;

    if (typeof window === 'undefined') return;
    const bridge = window.electron;
    if (!bridge?.onPromptContextAction) return;

    bridge.onPromptContextAction((payload) => {
        if (!payload?.action) return;
        dispatchPromptAction(payload.action);
    });
}

export function registerPromptTargetHandlers(targetId: string, handlers: PromptTargetHandlers): () => void {
    targetHandlers.set(targetId, handlers);
    initPromptActionListener();

    return () => {
        targetHandlers.delete(targetId);
        if (activeTargetId === targetId) {
            setActivePromptTarget(null);
        }
    };
}

export function setActivePromptTarget(targetId: string | null): void {
    activeTargetId = targetId;

    if (typeof window === 'undefined') return;
    const bridge = window.electron;
    if (!bridge?.setPromptTargetActive) return;
    try {
        bridge.setPromptTargetActive(!!targetId);
    } catch {
        // Ignore IPC bridge errors and keep local behavior.
    }
}

export function shouldUseNativePromptContextMenu(): boolean {
    return isElectronNativeContextMenuEnabled();
}
