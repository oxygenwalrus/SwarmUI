import { useEffect, useCallback } from 'react';

export interface KeyboardShortcuts {
    onGenerate?: () => void;
    onStop?: () => void;
    onNextImage?: () => void;
    onPrevImage?: () => void;
    onFirstImage?: () => void;
    onLastImage?: () => void;
    onToggleFavorite?: () => void;
    onDeleteImage?: () => void;
    onSaveSettings?: () => void;
    onFocusPrompt?: () => void;
    onFocusGallery?: () => void;
    isGenerating?: boolean;
}

/**
 * Hook to handle keyboard shortcuts throughout the app
 * 
 * Shortcuts:
 * - Ctrl+Enter: Generate image
 * - Escape: Stop generation
 * - ArrowLeft: Previous image
 * - ArrowRight: Next image
 * - Home: First image
 * - End: Last image
 * - F: Toggle favorite (when not focused on input)
 * - Delete: Delete current image
 * - G: Focus gallery
 * - P: Focus prompt
 * - Ctrl+S: Save current settings
 */
export function useKeyboardShortcuts({
    onGenerate,
    onStop,
    onNextImage,
    onPrevImage,
    onFirstImage,
    onLastImage,
    onToggleFavorite,
    onDeleteImage,
    onSaveSettings,
    onFocusPrompt,
    onFocusGallery,
    isGenerating = false,
}: KeyboardShortcuts) {

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        const target = event.target as HTMLElement;
        const isInputFocused =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        // Ctrl+Enter - Generate
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            if (!isGenerating && onGenerate) {
                onGenerate();
            }
            return;
        }

        // Escape - Stop generation
        if (event.key === 'Escape') {
            if (isGenerating && onStop) {
                event.preventDefault();
                onStop();
            }
            return;
        }

        // Ctrl+S - Save settings
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            onSaveSettings?.();
            return;
        }

        // Only handle these shortcuts when not focused on input
        if (!isInputFocused) {
            // ArrowLeft - Previous image
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                onPrevImage?.();
                return;
            }

            // ArrowRight - Next image
            if (event.key === 'ArrowRight') {
                event.preventDefault();
                onNextImage?.();
                return;
            }

            // F - Toggle favorite
            if (event.key === 'f' || event.key === 'F') {
                event.preventDefault();
                onToggleFavorite?.();
                return;
            }

            // G - Focus gallery
            if (event.key === 'g' || event.key === 'G') {
                event.preventDefault();
                onFocusGallery?.();
                return;
            }

            // P - Focus prompt
            if (event.key === 'p' || event.key === 'P') {
                event.preventDefault();
                onFocusPrompt?.();
                return;
            }

            // Delete - Delete current image
            if (event.key === 'Delete') {
                event.preventDefault();
                onDeleteImage?.();
                return;
            }

            // Home - First image
            if (event.key === 'Home') {
                event.preventDefault();
                onFirstImage?.();
                return;
            }

            // End - Last image
            if (event.key === 'End') {
                event.preventDefault();
                onLastImage?.();
                return;
            }
        }
    }, [onGenerate, onStop, onNextImage, onPrevImage, onFirstImage, onLastImage, onToggleFavorite, onDeleteImage, onSaveSettings, onFocusPrompt, onFocusGallery, isGenerating]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}

// Shortcuts info for display
export const KEYBOARD_SHORTCUTS = [
    { key: 'Ctrl + Enter', action: 'Generate image' },
    { key: 'Escape', action: 'Stop generation' },
    { key: 'Ctrl + S', action: 'Save settings' },
    { key: '← / →', action: 'Navigate images' },
    { key: 'Home / End', action: 'First / last image' },
    { key: 'F', action: 'Toggle favorite' },
    { key: 'Delete', action: 'Delete current image' },
    { key: 'G', action: 'Focus gallery' },
    { key: 'P', action: 'Focus prompt' },
];
