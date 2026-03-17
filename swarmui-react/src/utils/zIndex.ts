/**
 * Centralized z-index scale for consistent layering across the application.
 * Using Mantine's recommended z-index patterns.
 */
export const Z_INDEX = {
    // Base UI elements
    dropdown: 1000,
    tooltip: 1100,

    // Modals - use increments for nested modals
    modal: 1200,           // Primary modals (FloatingWindow browsers)
    modalNested: 1400,     // Secondary modals opened from primary (detail popups, upscaler)

    // Overlays
    notification: 9999,
} as const;

