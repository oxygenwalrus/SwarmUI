import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// ============================================================================
// Types
// ============================================================================

export type CanvasTool = 'pan' | 'brush' | 'eraser' | 'crop' | 'region' | 'select';

export type RegionType = 'rectangle' | 'freeform';

export interface Region {
    id: string;
    type: RegionType;
    path: number[]; // For rectangle: [x1,y1,x2,y2], for freeform: [x1,y1,x2,y2,...]
    prompt: string;
    weight: number;
    useInpaint: boolean;
    inpaintStrength: number;
    enabled: boolean;
    color: string;
}

export interface BrushSettings {
    size: number;
    opacity: number;
    hardness: number;
    color: string;
}

export interface CanvasState {
    // View state
    zoom: number;
    panX: number;
    panY: number;

    // Tool state
    currentTool: CanvasTool;
    brushSettings: BrushSettings;

    // Mask state
    maskOpacity: number;
    maskColor: string;
    maskBlur: number;
    invertMask: boolean;
    showMask: boolean;

    // Regional prompting
    regions: Region[];
    activeRegionId: string | null;
    showRegions: boolean;

    // Outpainting
    canvasWidth: number;
    canvasHeight: number;
    originalWidth: number;
    originalHeight: number;
    imageOffsetX: number;
    imageOffsetY: number;

    // History
    historyIndex: number;
    maxHistory: number;

    // Editor state
    isEditing: boolean;
    editingImageUrl: string | null;
}

export interface CanvasActions {
    // View actions
    setZoom: (zoom: number) => void;
    setPan: (x: number, y: number) => void;
    resetView: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    fitToScreen: () => void;

    // Tool actions
    setTool: (tool: CanvasTool) => void;
    setBrushSettings: (settings: Partial<BrushSettings>) => void;

    // Mask actions
    setMaskOpacity: (opacity: number) => void;
    setMaskColor: (color: string) => void;
    setMaskBlur: (blur: number) => void;
    setInvertMask: (invert: boolean) => void;
    toggleMaskVisibility: () => void;

    // Region actions
    addRegion: (region: Omit<Region, 'id'>) => void;
    updateRegion: (id: string, updates: Partial<Region>) => void;
    removeRegion: (id: string) => void;
    setActiveRegion: (id: string | null) => void;
    clearRegions: () => void;
    toggleRegionsVisibility: () => void;

    // Canvas size actions
    setCanvasSize: (width: number, height: number) => void;
    extendCanvas: (direction: 'top' | 'right' | 'bottom' | 'left', amount: number) => void;
    resetCanvasSize: () => void;
    setImageOffset: (x: number, y: number) => void;
    centerImage: () => void;

    // Editor actions
    openEditor: (imageUrl: string, width: number, height: number) => void;
    closeEditor: () => void;

    // Reset
    reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: CanvasState = {
    zoom: 1,
    panX: 0,
    panY: 0,

    currentTool: 'brush',
    brushSettings: {
        size: 50,
        opacity: 1,
        hardness: 0.8,
        color: '#ffffff',
    },

    maskOpacity: 0.5,
    maskColor: '#ff0000',
    maskBlur: 4,
    invertMask: false,
    showMask: true,

    regions: [],
    activeRegionId: null,
    showRegions: true,

    canvasWidth: 512,
    canvasHeight: 512,
    originalWidth: 512,
    originalHeight: 512,
    imageOffsetX: 0,
    imageOffsetY: 0,

    historyIndex: -1,
    maxHistory: 50,

    isEditing: false,
    editingImageUrl: null,
};

// ============================================================================
// Store
// ============================================================================

export const useCanvasEditorStore = create<CanvasState & CanvasActions>()(
    devtools(
        persist(
            (set) => ({
                ...initialState,

                // View actions
                setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),
                setPan: (panX, panY) => set({ panX, panY }),
                resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),
                zoomIn: () => set((state) => ({ zoom: Math.min(10, state.zoom * 1.25) })),
                zoomOut: () => set((state) => ({ zoom: Math.max(0.1, state.zoom / 1.25) })),
                fitToScreen: () => set({ zoom: 1, panX: 0, panY: 0 }),

                // Tool actions
                setTool: (currentTool) => set({ currentTool }),
                setBrushSettings: (settings) => set((state) => ({
                    brushSettings: { ...state.brushSettings, ...settings },
                })),

                // Mask actions
                setMaskOpacity: (maskOpacity) => set({ maskOpacity }),
                setMaskColor: (maskColor) => set({ maskColor }),
                setMaskBlur: (maskBlur) => set({ maskBlur }),
                setInvertMask: (invertMask) => set({ invertMask }),
                toggleMaskVisibility: () => set((state) => ({ showMask: !state.showMask })),

                // Region actions
                addRegion: (region) => set((state) => ({
                    regions: [
                        ...state.regions,
                        { ...region, id: `region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
                    ],
                })),
                updateRegion: (id, updates) => set((state) => ({
                    regions: state.regions.map((r) => (r.id === id ? { ...r, ...updates } : r)),
                })),
                removeRegion: (id) => set((state) => ({
                    regions: state.regions.filter((r) => r.id !== id),
                    activeRegionId: state.activeRegionId === id ? null : state.activeRegionId,
                })),
                setActiveRegion: (activeRegionId) => set({ activeRegionId }),
                clearRegions: () => set({ regions: [], activeRegionId: null }),
                toggleRegionsVisibility: () => set((state) => ({ showRegions: !state.showRegions })),

                // Canvas size actions
                setCanvasSize: (canvasWidth, canvasHeight) => set((state) => ({
                    canvasWidth,
                    canvasHeight,
                    imageOffsetX: Math.max(0, Math.min(state.imageOffsetX, canvasWidth - state.originalWidth)),
                    imageOffsetY: Math.max(0, Math.min(state.imageOffsetY, canvasHeight - state.originalHeight)),
                })),
                extendCanvas: (direction, amount) => set((state) => {
                    const newState: Partial<CanvasState> = {};
                    switch (direction) {
                        case 'top':
                            newState.canvasHeight = state.canvasHeight + amount;
                            newState.imageOffsetY = state.imageOffsetY + amount;
                            break;
                        case 'bottom':
                            newState.canvasHeight = state.canvasHeight + amount;
                            break;
                        case 'left':
                            newState.canvasWidth = state.canvasWidth + amount;
                            newState.imageOffsetX = state.imageOffsetX + amount;
                            break;
                        case 'right':
                            newState.canvasWidth = state.canvasWidth + amount;
                            break;
                    }
                    return newState;
                }),
                resetCanvasSize: () => set((state) => ({
                    canvasWidth: state.originalWidth,
                    canvasHeight: state.originalHeight,
                    imageOffsetX: 0,
                    imageOffsetY: 0,
                    panX: 0,
                    panY: 0,
                })),
                setImageOffset: (x, y) => set((state) => ({
                    imageOffsetX: Math.max(0, Math.min(x, state.canvasWidth - state.originalWidth)),
                    imageOffsetY: Math.max(0, Math.min(y, state.canvasHeight - state.originalHeight)),
                })),
                centerImage: () => set((state) => ({
                    imageOffsetX: Math.max(0, Math.floor((state.canvasWidth - state.originalWidth) / 2)),
                    imageOffsetY: Math.max(0, Math.floor((state.canvasHeight - state.originalHeight) / 2)),
                })),

                // Editor actions
                openEditor: (editingImageUrl, width, height) => set({
                    isEditing: true,
                    editingImageUrl,
                    canvasWidth: width,
                    canvasHeight: height,
                    originalWidth: width,
                    originalHeight: height,
                    imageOffsetX: 0,
                    imageOffsetY: 0,
                    zoom: 1,
                    panX: 0,
                    panY: 0,
                }),
                closeEditor: () => set({
                    isEditing: false,
                    editingImageUrl: null,
                }),

                // Reset
                reset: () => set(initialState),
            }),
            {
                name: 'canvas-editor-storage',
                partialize: (state) => ({
                    brushSettings: state.brushSettings,
                    maskOpacity: state.maskOpacity,
                    maskColor: state.maskColor,
                    maskBlur: state.maskBlur,
                    currentTool: state.currentTool,
                }),
            }
        ),
        { name: 'CanvasEditorStore' }
    )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsEditing = (state: CanvasState) => state.isEditing;
export const selectCurrentTool = (state: CanvasState) => state.currentTool;
export const selectBrushSettings = (state: CanvasState) => state.brushSettings;
export const selectZoom = (state: CanvasState) => state.zoom;
export const selectRegions = (state: CanvasState) => state.regions;
export const selectActiveRegion = (state: CanvasState) =>
    state.regions.find((r) => r.id === state.activeRegionId) || null;
