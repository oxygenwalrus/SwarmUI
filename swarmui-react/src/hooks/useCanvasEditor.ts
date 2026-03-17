import { useState, useCallback, useRef } from 'react';
import { useCanvasEditorStore } from '../stores/canvasEditorStore';
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
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    maskCanvasRef: React.RefObject<HTMLCanvasElement | null>;
    containerRef: React.RefObject<HTMLDivElement | null>;
    isDrawing: boolean;
    lastPoint: Point | null;
    history: HistoryEntry[];
    historyIndex: number;
    canUndo: boolean;
    canRedo: boolean;
    startDrawing: (e: React.MouseEvent | React.TouchEvent) => void;
    draw: (e: React.MouseEvent | React.TouchEvent) => void;
    stopDrawing: () => void;
    getCanvasPoint: (e: React.MouseEvent | React.TouchEvent) => Point;
    clearMask: () => void;
    fillMask: () => void;
    invertMask: () => void;
    getMaskDataUrl: () => string | null;
    undo: () => void;
    redo: () => void;
    saveToHistory: () => void;
    handleWheel: (e: React.WheelEvent) => void;
    handlePanStart: (e: React.MouseEvent) => void;
    handlePan: (e: React.MouseEvent) => void;
    handlePanEnd: () => void;
    isPanning: boolean;
    regionDraft: { x1: number; y1: number; x2: number; y2: number } | null;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function useCanvasEditor(): UseCanvasEditorReturn {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const [isDrawingRegion, setIsDrawingRegion] = useState(false);
    const [lastPoint, setLastPoint] = useState<Point | null>(null);
    const [regionStartPoint, setRegionStartPoint] = useState<Point | null>(null);
    const [regionDraft, setRegionDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
    const [regionInteraction, setRegionInteraction] = useState<{
        regionId: string;
        handle: RegionResizeHandle;
        startPoint: Point;
        originalRegion: BuilderRegionRule;
    } | null>(null);
    const [imageInteraction, setImageInteraction] = useState<{
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
    } = useCanvasEditorStore();
    const regions = usePromptBuilderStore((state) => state.regions);
    const addRegion = usePromptBuilderStore((state) => state.addRegion);
    const updateRegion = usePromptBuilderStore((state) => state.updateRegion);

    const getCanvasPoint = useCallback((e: React.MouseEvent | React.TouchEvent): Point => {
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

    const drawLine = useCallback((from: Point, to: Point, erase = false) => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (!ctx) {
            return;
        }

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
    }, [brushSettings.opacity, brushSettings.size, maskColor]);

    const isPointInsideImage = useCallback((point: Point) => (
        point.x >= imageOffsetX
        && point.x <= imageOffsetX + originalWidth
        && point.y >= imageOffsetY
        && point.y <= imageOffsetY + originalHeight
    ), [imageOffsetX, imageOffsetY, originalHeight, originalWidth]);

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

    const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (currentTool === 'crop') {
            const point = getCanvasPoint(e);
            if (!isPointInsideImage(point)) {
                return;
            }
            setImageInteraction({
                startPoint: point,
                startOffsetX: imageOffsetX,
                startOffsetY: imageOffsetY,
            });
            return;
        }

        if (currentTool === 'region') {
            const point = getCanvasPoint(e);
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

        const point = getCanvasPoint(e);
        setIsDrawing(true);
        setLastPoint(point);
        drawLine(point, point, currentTool === 'eraser');
    }, [
        currentTool,
        drawLine,
        findRegionAtPoint,
        getCanvasPoint,
        getRegionHandleAtPoint,
        imageOffsetX,
        imageOffsetY,
        isPointInsideImage,
        regions,
        setActiveRegion,
    ]);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (currentTool === 'crop' && imageInteraction) {
            const point = getCanvasPoint(e);
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

        if (currentTool === 'region' && regionInteraction) {
            const point = getCanvasPoint(e);
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
            const point = getCanvasPoint(e);
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

        const point = getCanvasPoint(e);
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
        isDrawing,
        isDrawingRegion,
        lastPoint,
        originalHeight,
        originalWidth,
        regionInteraction,
        regionStartPoint,
        setImageOffset,
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
        imageInteraction,
        isDrawing,
        isDrawingRegion,
        regionDraft,
        regionInteraction,
        saveToHistory,
        setActiveRegion,
    ]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
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

    const handlePanStart = useCallback((e: React.MouseEvent) => {
        if (currentTool === 'pan' || e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true);
            setPanStartPoint({ x: e.clientX - panX, y: e.clientY - panY });
        }
    }, [currentTool, panX, panY]);

    const handlePan = useCallback((e: React.MouseEvent) => {
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
    }, [saveToHistory]);

    const fillMask = useCallback(() => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        const canvas = maskCanvasRef.current;
        if (!ctx || !canvas) {
            return;
        }
        ctx.fillStyle = maskColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveToHistory();
    }, [maskColor, saveToHistory]);

    const invertMask = useCallback(() => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        const canvas = maskCanvasRef.current;
        if (!ctx || !canvas) {
            return;
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 3; i < data.length; i += 4) {
            data[i] = 255 - data[i];
        }
        ctx.putImageData(imageData, 0, 0);
        saveToHistory();
    }, [saveToHistory]);

    const getMaskDataUrl = useCallback((): string | null => {
        const canvas = maskCanvasRef.current;
        if (!canvas) {
            return null;
        }

        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = canvas.width;
        outputCanvas.height = canvas.height;
        const outputCtx = outputCanvas.getContext('2d');
        const maskCtx = canvas.getContext('2d');
        if (!outputCtx || !maskCtx) {
            return null;
        }

        outputCtx.fillStyle = '#000000';
        outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

        let hasMaskedPixels = false;
        const outpaintLeft = clamp(Math.round(imageOffsetX), 0, outputCanvas.width);
        const outpaintTop = clamp(Math.round(imageOffsetY), 0, outputCanvas.height);
        const outpaintRight = clamp(Math.round(imageOffsetX + originalWidth), 0, outputCanvas.width);
        const outpaintBottom = clamp(Math.round(imageOffsetY + originalHeight), 0, outputCanvas.height);
        outputCtx.fillStyle = '#ffffff';
        if (outpaintTop > 0) {
            outputCtx.fillRect(0, 0, outputCanvas.width, outpaintTop);
            hasMaskedPixels = true;
        }
        if (outpaintBottom < outputCanvas.height) {
            outputCtx.fillRect(0, outpaintBottom, outputCanvas.width, outputCanvas.height - outpaintBottom);
            hasMaskedPixels = true;
        }
        if (outpaintLeft > 0 && outpaintBottom > outpaintTop) {
            outputCtx.fillRect(0, outpaintTop, outpaintLeft, outpaintBottom - outpaintTop);
            hasMaskedPixels = true;
        }
        if (outpaintRight < outputCanvas.width && outpaintBottom > outpaintTop) {
            outputCtx.fillRect(
                outpaintRight,
                outpaintTop,
                outputCanvas.width - outpaintRight,
                outpaintBottom - outpaintTop,
            );
            hasMaskedPixels = true;
        }

        const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
        const outputData = outputCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
        for (let i = 0; i < maskData.data.length; i += 4) {
            if (maskData.data[i + 3] <= 0) {
                continue;
            }
            outputData.data[i] = 255;
            outputData.data[i + 1] = 255;
            outputData.data[i + 2] = 255;
            outputData.data[i + 3] = 255;
            hasMaskedPixels = true;
        }

        if (!hasMaskedPixels) {
            return null;
        }

        outputCtx.putImageData(outputData, 0, 0);
        return outputCanvas.toDataURL('image/png');
    }, [imageOffsetX, imageOffsetY, originalHeight, originalWidth]);

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
        undo,
        redo,
        saveToHistory,
        handleWheel,
        handlePanStart,
        handlePan,
        handlePanEnd,
        isPanning,
        regionDraft,
    };
}
