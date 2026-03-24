import {
    useState,
    useCallback,
    useRef,
    type MouseEvent,
    type RefObject,
    type TouchEvent,
    type WheelEvent,
} from 'react';
import { useCanvasEditorStore, type CanvasImageLayer, type CanvasSelection } from '../stores/canvasEditorStore';
import { usePromptBuilderStore } from '../stores/promptBuilderStore';
import {
    normalizeRegionFromPixels,
    resizeNormalizedRegion,
    type RegionResizeHandle,
} from '../features/promptBuilder';
import type { BuilderRegionRule } from '../features/promptBuilder';

export interface Point {
    x: number;
    y: number;
}

export interface HistoryEntry {
    maskData: ImageData | null;
    timestamp: number;
}

export interface UseCanvasEditorReturn {
    canvasRef: RefObject<HTMLCanvasElement | null>;
    maskCanvasRef: RefObject<HTMLCanvasElement | null>;
    containerRef: RefObject<HTMLDivElement | null>;
    isDrawing: boolean;
    lastPoint: Point | null;
    history: HistoryEntry[];
    historyIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    startDrawing: (e: MouseEvent | TouchEvent) => void;
    draw: (e: MouseEvent | TouchEvent) => void;
    stopDrawing: () => void;
    getCanvasPoint: (e: MouseEvent | TouchEvent) => Point;
    clearMask: () => void;
    fillMask: () => void;
    invertMask: () => void;
    getMaskDataUrl: () => string | null;
    getCompositeImageDataUrl: (selection?: CanvasSelection | null) => string | null;
    applyMaskImage: (image: CanvasImageSource, destination?: CanvasSelection | null) => void;
    undo: () => void;
    redo: () => void;
    saveToHistory: () => void;
    handleWheel: (e: WheelEvent) => void;
    handlePanStart: (e: MouseEvent) => void;
    handlePan: (e: MouseEvent) => void;
    handlePanEnd: () => void;
    isPanning: boolean;
    regionDraft: { x1: number; y1: number; x2: number; y2: number } | null;
    selectionDraft: CanvasSelection | null;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function normalizeSelection(start: Point, end: Point, canvasWidth: number, canvasHeight: number): CanvasSelection {
    const x1 = clamp(Math.min(start.x, end.x), 0, canvasWidth);
    const y1 = clamp(Math.min(start.y, end.y), 0, canvasHeight);
    const x2 = clamp(Math.max(start.x, end.x), 0, canvasWidth);
    const y2 = clamp(Math.max(start.y, end.y), 0, canvasHeight);
    return {
        x: x1,
        y: y1,
        width: x2 - x1,
        height: y2 - y1,
    };
}

function pointInsideRect(point: Point, rect: CanvasSelection | null): boolean {
    if (!rect) {
        return false;
    }
    return point.x >= rect.x
        && point.x <= rect.x + rect.width
        && point.y >= rect.y
        && point.y <= rect.y + rect.height;
}

function pointInsideLayer(point: Point, layer: CanvasImageLayer): boolean {
    return point.x >= layer.x
        && point.x <= layer.x + layer.width
        && point.y >= layer.y
        && point.y <= layer.y + layer.height;
}

export function useCanvasEditor(): UseCanvasEditorReturn {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [isDrawingRegion, setIsDrawingRegion] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [lastPoint, setLastPoint] = useState<Point | null>(null);
    const [regionStartPoint, setRegionStartPoint] = useState<Point | null>(null);
    const [selectionStartPoint, setSelectionStartPoint] = useState<Point | null>(null);
    const [regionDraft, setRegionDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    const [selectionDraft, setSelectionDraft] = useState<CanvasSelection | null>(null);
    const [regionInteraction, setRegionInteraction] = useState<{
        regionId: string;
        handle: RegionResizeHandle;
        startPoint: Point;
        originalRegion: BuilderRegionRule;
    } | null>(null);
    const [imageInteraction, setImageInteraction] = useState<{
        target: 'base' | 'layer';
        layerId: string | null;
        startPoint: Point;
        startOffsetX: number;
        startOffsetY: number;
    } | null>(null);
    const [panStartPoint, setPanStartPoint] = useState<Point | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const {
        currentTool,
        brushSettings,
        zoom,
        panX,
        panY,
        setZoom,
        setPan,
        maskColor,
        activeRegionId,
        setActiveRegion,
        canvasWidth,
        canvasHeight,
        originalWidth,
        originalHeight,
        imageOffsetX,
        imageOffsetY,
        setImageOffset,
        imageLayers,
        selection,
        setSelection,
        clearSelection,
        setActiveImageLayer,
        updateImageLayer,
    } = useCanvasEditorStore();
    const regions = usePromptBuilderStore((state) => state.regions);
    const addRegion = usePromptBuilderStore((state) => state.addRegion);
    const updateRegion = usePromptBuilderStore((state) => state.updateRegion);

    const getCanvasPoint = useCallback((e: MouseEvent | TouchEvent): Point => {
        const container = containerRef.current;
        if (!container) {
            return { x: 0, y: 0 };
        }

        const rect = container.getBoundingClientRect();
        let clientX: number;
        let clientY: number;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        return {
            x: (clientX - rect.left - panX) / zoom,
            y: (clientY - rect.top - panY) / zoom,
        };
    }, [panX, panY, zoom]);

    const withSelectionClip = useCallback((ctx: CanvasRenderingContext2D, drawFn: () => void) => {
        if (selection && selection.width > 0 && selection.height > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(selection.x, selection.y, selection.width, selection.height);
            ctx.clip();
            drawFn();
            ctx.restore();
            return;
        }
        drawFn();
    }, [selection]);

    const drawLine = useCallback((from: Point, to: Point, erase = false) => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (!ctx) {
            return;
        }

        withSelectionClip(ctx, () => {
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.lineWidth = brushSettings.size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (erase) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.strokeStyle = 'rgba(0,0,0,1)';
            } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.globalAlpha = brushSettings.opacity;
                ctx.strokeStyle = maskColor;
            }

            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        });
    }, [brushSettings.opacity, brushSettings.size, maskColor, withSelectionClip]);

    const isPointInsideBaseImage = useCallback((point: Point) => (
        point.x >= imageOffsetX
        && point.x <= imageOffsetX + originalWidth
        && point.y >= imageOffsetY
        && point.y <= imageOffsetY + originalHeight
    ), [imageOffsetX, imageOffsetY, originalHeight, originalWidth]);

    const findLayerAtPoint = useCallback((point: Point): CanvasImageLayer | null => {
        for (let i = imageLayers.length - 1; i >= 0; i -= 1) {
            const layer = imageLayers[i];
            if (!layer.visible) {
                continue;
            }
            if (pointInsideLayer(point, layer)) {
                return layer;
            }
        }
        return null;
    }, [imageLayers]);

    const findRegionAtPoint = useCallback((point: Point): string | null => {
        for (let i = regions.length - 1; i >= 0; i -= 1) {
            const region = regions[i];
            if (region.shape !== 'rectangle') {
                continue;
            }
            const left = region.x * canvasWidth;
            const top = region.y * canvasHeight;
            const right = left + region.width * canvasWidth;
            const bottom = top + region.height * canvasHeight;
            if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
                return region.id;
            }
        }
        return null;
    }, [canvasHeight, canvasWidth, regions]);

    const getRegionHandleAtPoint = useCallback((point: Point): { regionId: string; handle: RegionResizeHandle } | null => {
        const activeRegion = regions.find((region) => region.id === activeRegionId) ?? null;
        if (!activeRegion || activeRegion.shape !== 'rectangle') {
            return null;
        }

        const left = activeRegion.x * canvasWidth;
        const top = activeRegion.y * canvasHeight;
        const right = left + activeRegion.width * canvasWidth;
        const bottom = top + activeRegion.height * canvasHeight;
        const middleX = (left + right) / 2;
        const middleY = (top + bottom) / 2;
        const threshold = Math.max(6, 10 / Math.max(zoom, 0.25));
        const handles: Array<{ x: number; y: number; handle: RegionResizeHandle }> = [
            { x: left, y: top, handle: 'north-west' },
            { x: middleX, y: top, handle: 'north' },
            { x: right, y: top, handle: 'north-east' },
            { x: left, y: middleY, handle: 'west' },
            { x: right, y: middleY, handle: 'east' },
            { x: left, y: bottom, handle: 'south-west' },
            { x: middleX, y: bottom, handle: 'south' },
            { x: right, y: bottom, handle: 'south-east' },
        ];

        for (const handle of handles) {
            const dx = handle.x - point.x;
            const dy = handle.y - point.y;
            if (Math.sqrt(dx * dx + dy * dy) <= threshold) {
                return { regionId: activeRegion.id, handle: handle.handle };
            }
        }

        return null;
    }, [activeRegionId, canvasHeight, canvasWidth, regions, zoom]);

    const startDrawing = useCallback((e: MouseEvent | TouchEvent) => {
        const point = getCanvasPoint(e);

        if (currentTool === 'crop') {
            const hitLayer = findLayerAtPoint(point);
            if (hitLayer) {
                setActiveImageLayer(hitLayer.id);
                setImageInteraction({
                    target: 'layer',
                    layerId: hitLayer.id,
                    startPoint: point,
                    startOffsetX: hitLayer.x,
                    startOffsetY: hitLayer.y,
                });
                return;
            }
            if (!isPointInsideBaseImage(point)) {
                return;
            }
            setActiveImageLayer(null);
            setImageInteraction({
                target: 'base',
                layerId: null,
                startPoint: point,
                startOffsetX: imageOffsetX,
                startOffsetY: imageOffsetY,
            });
            return;
        }

        if (currentTool === 'select') {
            setSelectionStartPoint(point);
            setSelectionDraft({ x: point.x, y: point.y, width: 0, height: 0 });
            setIsSelecting(true);
            return;
        }

        if (currentTool === 'region') {
            const handleHit = getRegionHandleAtPoint(point);
            if (handleHit) {
                const targetRegion = regions.find((region) => region.id === handleHit.regionId);
                if (targetRegion) {
                    setActiveRegion(handleHit.regionId);
                    setRegionInteraction({
                        regionId: targetRegion.id,
                        handle: handleHit.handle,
                        startPoint: point,
                        originalRegion: targetRegion,
                    });
                    setIsDrawingRegion(false);
                    setRegionStartPoint(null);
                    setRegionDraft(null);
                    return;
                }
            }

            const hitRegionId = findRegionAtPoint(point);
            if (hitRegionId) {
                setActiveRegion(hitRegionId);
                const targetRegion = regions.find((region) => region.id === hitRegionId);
                if (targetRegion) {
                    setRegionInteraction({
                        regionId: targetRegion.id,
                        handle: 'move',
                        startPoint: point,
                        originalRegion: targetRegion,
                    });
                }
                setIsDrawingRegion(false);
                setRegionStartPoint(null);
                setRegionDraft(null);
                return;
            }

            setActiveRegion(null);
            setIsDrawingRegion(true);
            setRegionStartPoint(point);
            setRegionDraft({
                x1: point.x,
                y1: point.y,
                x2: point.x,
                y2: point.y,
            });
            return;
        }

        if (currentTool !== 'brush' && currentTool !== 'eraser') {
            return;
        }

        if (selection && selection.width > 0 && selection.height > 0 && !pointInsideRect(point, selection)) {
            return;
        }

        setIsDrawing(true);
        setLastPoint(point);
        drawLine(point, point, currentTool === 'eraser');
    }, [
        currentTool,
        drawLine,
        findLayerAtPoint,
        findRegionAtPoint,
        getCanvasPoint,
        getRegionHandleAtPoint,
        imageOffsetX,
        imageOffsetY,
        isPointInsideBaseImage,
        regions,
        selection,
        setActiveImageLayer,
        setActiveRegion,
    ]);

    const draw = useCallback((e: MouseEvent | TouchEvent) => {
        const point = getCanvasPoint(e);

        if (currentTool === 'crop' && imageInteraction) {
            if (imageInteraction.target === 'layer' && imageInteraction.layerId) {
                const layer = imageLayers.find((entry) => entry.id === imageInteraction.layerId);
                if (!layer) {
                    return;
                }
                updateImageLayer(imageInteraction.layerId, {
                    x: clamp(
                        imageInteraction.startOffsetX + (point.x - imageInteraction.startPoint.x),
                        0,
                        Math.max(0, canvasWidth - layer.width),
                    ),
                    y: clamp(
                        imageInteraction.startOffsetY + (point.y - imageInteraction.startPoint.y),
                        0,
                        Math.max(0, canvasHeight - layer.height),
                    ),
                });
                return;
            }

            const nextOffsetX = clamp(
                imageInteraction.startOffsetX + (point.x - imageInteraction.startPoint.x),
                0,
                Math.max(0, canvasWidth - originalWidth),
            );
            const nextOffsetY = clamp(
                imageInteraction.startOffsetY + (point.y - imageInteraction.startPoint.y),
                0,
                Math.max(0, canvasHeight - originalHeight),
            );
            setImageOffset(nextOffsetX, nextOffsetY);
            return;
        }

        if (currentTool === 'select' && isSelecting && selectionStartPoint) {
            setSelectionDraft(normalizeSelection(selectionStartPoint, point, canvasWidth, canvasHeight));
            return;
        }

        if (currentTool === 'region' && regionInteraction) {
            const deltaX = (point.x - regionInteraction.startPoint.x) / canvasWidth;
            const deltaY = (point.y - regionInteraction.startPoint.y) / canvasHeight;
            const nextRegion = resizeNormalizedRegion(
                regionInteraction.originalRegion,
                regionInteraction.handle,
                deltaX,
                deltaY,
            );
            updateRegion(regionInteraction.regionId, nextRegion);
            return;
        }

        if (currentTool === 'region' && isDrawingRegion && regionStartPoint) {
            setRegionDraft({
                x1: regionStartPoint.x,
                y1: regionStartPoint.y,
                x2: clamp(point.x, 0, canvasWidth),
                y2: clamp(point.y, 0, canvasHeight),
            });
            return;
        }

        if (!isDrawing || (currentTool !== 'brush' && currentTool !== 'eraser')) {
            return;
        }

        if (selection && selection.width > 0 && selection.height > 0 && !pointInsideRect(point, selection) && !pointInsideRect(lastPoint ?? point, selection)) {
            return;
        }

        if (lastPoint) {
            drawLine(lastPoint, point, currentTool === 'eraser');
        }
        setLastPoint(point);
    }, [
        canvasHeight,
        canvasWidth,
        currentTool,
        drawLine,
        getCanvasPoint,
        imageInteraction,
        imageLayers,
        isDrawing,
        isDrawingRegion,
        isSelecting,
        lastPoint,
        originalHeight,
        originalWidth,
        regionInteraction,
        regionStartPoint,
        selection,
        selectionStartPoint,
        setImageOffset,
        updateImageLayer,
        updateRegion,
    ]);

    const saveToHistory = useCallback(() => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        const canvas = maskCanvasRef.current;
        if (!ctx || !canvas) {
            return;
        }

        const maskData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        setHistory((prev) => {
            const nextHistory = prev.slice(0, historyIndex + 1);
            nextHistory.push({ maskData, timestamp: Date.now() });
            if (nextHistory.length > 50) {
                nextHistory.shift();
            }
            return nextHistory;
        });

        setHistoryIndex((prev) => Math.min(prev + 1, 49));
    }, [historyIndex]);

    const stopDrawing = useCallback(() => {
        if (imageInteraction) {
            setImageInteraction(null);
            return;
        }

        if (regionInteraction) {
            setRegionInteraction(null);
            return;
        }

        if (isSelecting) {
            if (selectionDraft && selectionDraft.width >= 2 && selectionDraft.height >= 2) {
                setSelection(selectionDraft);
            } else {
                clearSelection();
            }
            setIsSelecting(false);
            setSelectionStartPoint(null);
            setSelectionDraft(null);
            return;
        }

        if (isDrawingRegion) {
            if (regionDraft) {
                const normalized = normalizeRegionFromPixels(
                    regionDraft.x1,
                    regionDraft.y1,
                    regionDraft.x2,
                    regionDraft.y2,
                    canvasWidth,
                    canvasHeight,
                );
                if (normalized.width >= 0.01 && normalized.height >= 0.01) {
                    const id = addRegion({
                        ...normalized,
                        prompt: '',
                        strength: 0.5,
                        useInpaint: false,
                        inpaintStrength: 0.5,
                        enabled: true,
                    });
                    setActiveRegion(id);
                }
            }
            setIsDrawingRegion(false);
            setRegionStartPoint(null);
            setRegionDraft(null);
            return;
        }

        if (isDrawing) {
            saveToHistory();
        }
        setIsDrawing(false);
        setLastPoint(null);
    }, [
        addRegion,
        canvasHeight,
        canvasWidth,
        clearSelection,
        imageInteraction,
        isDrawing,
        isDrawingRegion,
        isSelecting,
        regionDraft,
        regionInteraction,
        saveToHistory,
        selectionDraft,
        setActiveRegion,
        setSelection,
    ]);

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(10, zoom * delta));

        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom);
            const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom);
            setPan(newPanX, newPanY);
        }

        setZoom(newZoom);
    }, [panX, panY, setPan, setZoom, zoom]);

    const handlePanStart = useCallback((e: MouseEvent) => {
        if (currentTool === 'pan' || e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true);
            setPanStartPoint({ x: e.clientX - panX, y: e.clientY - panY });
        }
    }, [currentTool, panX, panY]);

    const handlePan = useCallback((e: MouseEvent) => {
        if (!isPanning || !panStartPoint) {
            return;
        }
        setPan(e.clientX - panStartPoint.x, e.clientY - panStartPoint.y);
    }, [isPanning, panStartPoint, setPan]);

    const handlePanEnd = useCallback(() => {
        setIsPanning(false);
        setPanStartPoint(null);
    }, []);

    const clearMask = useCallback(() => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        const canvas = maskCanvasRef.current;
        if (!ctx || !canvas) {
            return;
        }
        withSelectionClip(ctx, () => {
            if (selection && selection.width > 0 && selection.height > 0) {
                ctx.clearRect(selection.x, selection.y, selection.width, selection.height);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        });
        saveToHistory();
    }, [saveToHistory, selection, withSelectionClip]);

    const fillMask = useCallback(() => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        const canvas = maskCanvasRef.current;
        if (!ctx || !canvas) {
            return;
        }
        withSelectionClip(ctx, () => {
            ctx.fillStyle = maskColor;
            if (selection && selection.width > 0 && selection.height > 0) {
                ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
            } else {
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        });
        saveToHistory();
    }, [maskColor, saveToHistory, selection, withSelectionClip]);

    const invertMask = useCallback(() => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        const canvas = maskCanvasRef.current;
        if (!ctx || !canvas) {
            return;
        }

        const selectionArea = selection && selection.width > 0 && selection.height > 0
            ? {
                x: Math.round(selection.x),
                y: Math.round(selection.y),
                width: Math.round(selection.width),
                height: Math.round(selection.height),
            }
            : {
                x: 0,
                y: 0,
                width: canvas.width,
                height: canvas.height,
            };

        const imageData = ctx.getImageData(selectionArea.x, selectionArea.y, selectionArea.width, selectionArea.height);
        const data = imageData.data;
        for (let i = 3; i < data.length; i += 4) {
            data[i] = 255 - data[i];
        }
        ctx.putImageData(imageData, selectionArea.x, selectionArea.y);
        saveToHistory();
    }, [saveToHistory, selection]);

    const getCompositeImageDataUrl = useCallback((selectionRect?: CanvasSelection | null): string | null => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return null;
        }
        if (!selectionRect || selectionRect.width <= 0 || selectionRect.height <= 0) {
            return canvas.toDataURL('image/png');
        }

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = Math.max(1, Math.round(selectionRect.width));
        croppedCanvas.height = Math.max(1, Math.round(selectionRect.height));
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) {
            return null;
        }
        croppedCtx.drawImage(
            canvas,
            Math.round(selectionRect.x),
            Math.round(selectionRect.y),
            Math.round(selectionRect.width),
            Math.round(selectionRect.height),
            0,
            0,
            croppedCanvas.width,
            croppedCanvas.height,
        );
        return croppedCanvas.toDataURL('image/png');
    }, []);

    const applyMaskImage = useCallback((image: CanvasImageSource, destination?: CanvasSelection | null) => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        const canvas = maskCanvasRef.current;
        if (!ctx || !canvas) {
            return;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = destination ? Math.max(1, Math.round(destination.width)) : canvas.width;
        tempCanvas.height = destination ? Math.max(1, Math.round(destination.height)) : canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) {
            return;
        }

        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
            const brightness = imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2];
            const alpha = brightness >= 128 ? 255 : 0;
            imageData.data[i] = 255;
            imageData.data[i + 1] = 255;
            imageData.data[i + 2] = 255;
            imageData.data[i + 3] = alpha;
        }
        tempCtx.putImageData(imageData, 0, 0);

        if (destination && destination.width > 0 && destination.height > 0) {
            ctx.clearRect(destination.x, destination.y, destination.width, destination.height);
            ctx.drawImage(
                tempCanvas,
                0,
                0,
                tempCanvas.width,
                tempCanvas.height,
                destination.x,
                destination.y,
                destination.width,
                destination.height,
            );
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(tempCanvas, 0, 0);
        }

        saveToHistory();
    }, [saveToHistory]);

    const getMaskDataUrl = useCallback((): string | null => {
        const compositeCanvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        if (!compositeCanvas || !maskCanvas) {
            return null;
        }

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = maskCanvas.width;
        outputCanvas.height = maskCanvas.height;
        const outputCtx = outputCanvas.getContext('2d');
        const maskCtx = maskCanvas.getContext('2d');
        const compositeCtx = compositeCanvas.getContext('2d');
        if (!outputCtx || !maskCtx || !compositeCtx) {
            return null;
        }

        const compositeData = compositeCtx.getImageData(0, 0, compositeCanvas.width, compositeCanvas.height);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const outputData = outputCtx.createImageData(outputCanvas.width, outputCanvas.height);
        let hasMaskedPixels = false;

        for (let i = 0; i < outputData.data.length; i += 4) {
            const compositeAlpha = compositeData.data[i + 3];
            const maskAlpha = maskData.data[i + 3];
            if (compositeAlpha <= 0 || maskAlpha > 0) {
                outputData.data[i] = 255;
                outputData.data[i + 1] = 255;
                outputData.data[i + 2] = 255;
                outputData.data[i + 3] = 255;
                hasMaskedPixels = true;
            }
        }

        if (!hasMaskedPixels) {
            return null;
        }

        outputCtx.putImageData(outputData, 0, 0);
        return outputCanvas.toDataURL('image/png');
    }, []);

    const undo = useCallback(() => {
        if (historyIndex <= 0) {
            return;
        }
        const ctx = maskCanvasRef.current?.getContext('2d');
        const canvas = maskCanvasRef.current;
        if (!ctx || !canvas) {
            return;
        }

        const newIndex = historyIndex - 1;
        const entry = history[newIndex];
        if (entry?.maskData) {
            ctx.putImageData(entry.maskData, 0, 0);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        setHistoryIndex(newIndex);
    }, [history, historyIndex]);

    const redo = useCallback(() => {
        if (historyIndex >= history.length - 1) {
            return;
        }
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (!ctx) {
            return;
        }

        const newIndex = historyIndex + 1;
        const entry = history[newIndex];
        if (entry?.maskData) {
            ctx.putImageData(entry.maskData, 0, 0);
        }
        setHistoryIndex(newIndex);
    }, [history, historyIndex]);

    return {
        canvasRef,
        maskCanvasRef,
        containerRef,
        isDrawing,
        lastPoint,
        history,
        historyIndex,
        canUndo: historyIndex > 0,
        canRedo: historyIndex < history.length - 1,
        startDrawing,
        draw,
        stopDrawing,
        getCanvasPoint,
        clearMask,
        fillMask,
        invertMask,
        getMaskDataUrl,
        getCompositeImageDataUrl,
        applyMaskImage,
        undo,
        redo,
        saveToHistory,
        handleWheel,
        handlePanStart,
        handlePan,
        handlePanEnd,
        isPanning,
        regionDraft,
        selectionDraft,
    };
}
