import { memo, useEffect, useState, useCallback, useRef } from 'react';
import {
    Box,
    Stack,
    Paper,
    Group,
    Text,
    ActionIcon,
    Tooltip,
    Slider,
    ColorSwatch,
    Button,
    Divider,
    ScrollArea,
    Badge,
} from '@mantine/core';
import {
    IconBrush,
    IconEraser,
    IconHandStop,
    IconCrop,
    IconZoomIn,
    IconZoomOut,
    IconArrowBackUp,
    IconArrowForwardUp,
    IconTrash,
    IconPaint,
    IconSwitchHorizontal,
    IconX,
    IconCheck,
    IconSquare,
} from '@tabler/icons-react';
import { useCanvasEditor } from '../../hooks/useCanvasEditor';
import { useCanvasEditorStore, type CanvasTool } from '../../stores/canvasEditorStore';
import { usePromptBuilderStore } from '../../stores/promptBuilderStore';
import {
    compilePromptBuilder,
    normalizedRegionToPixels,
    type CanvasApplyPayload,
} from '../../features/promptBuilder';
import { RegionalPromptEditor } from './RegionalPromptEditor';
import { SegmentRulesPanel } from './SegmentRulesPanel';
import { OutpaintControls } from './OutpaintControls';
import type { CanvasWorkflowResult, CanvasWorkflowStep } from '../../stores/canvasWorkflowStore';

// ============================================================================
// Types
// ============================================================================

interface CanvasEditorProps {
    /** Source image URL to edit */
    imageUrl: string;
    /** Image width (optional) */
    width?: number;
    /** Image height (optional) */
    height?: number;
    /** Called when mask changes */
    onMaskChange?: (maskDataUrl: string | null) => void;
    /** Called when editor is closed */
    onClose?: () => void;
    /** Called when user applies changes */
    onApply?: (payload: CanvasApplyPayload) => void;
    /** Editor mode */
    mode?: 'inpaint' | 'outpaint' | 'regional' | 'workflow';
    /** Current guided workflow step */
    workflowStep?: CanvasWorkflowStep;
    /** Called when the workflow step changes */
    onWorkflowStepChange?: (step: CanvasWorkflowStep) => void;
    /** Explicit apply-to-generate action */
    onApplyToGenerate?: (payload: CanvasApplyPayload) => void;
    /** Explicit generate action */
    onGenerateFromCanvas?: (payload: CanvasApplyPayload) => void;
    /** Open the compatibility-safe upscaler flow */
    onOpenUpscaler?: () => void;
    /** Current result that can be accepted back into the workflow */
    pendingResult?: CanvasWorkflowResult | null;
    /** Accept the pending result as the working image */
    onUsePendingResult?: () => void;
    /** Accept the pending result and jump back to refinement */
    onContinueRefining?: () => void;
    /** Signal used to clear mask when the working image changes */
    clearMaskVersion?: number;
}

// ============================================================================
// Tool definitions
// ============================================================================

const TOOLS: { id: CanvasTool; icon: typeof IconBrush; label: string; shortcut: string }[] = [
    { id: 'brush', icon: IconBrush, label: 'Brush', shortcut: 'B' },
    { id: 'eraser', icon: IconEraser, label: 'Eraser', shortcut: 'E' },
    { id: 'pan', icon: IconHandStop, label: 'Pan', shortcut: 'H' },
    { id: 'region', icon: IconSquare, label: 'Region', shortcut: 'R' },
    { id: 'crop', icon: IconCrop, label: 'Move Base', shortcut: 'C' },
];

const BRUSH_SIZES = [5, 10, 25, 50, 100, 200];
const MASK_COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
const REGION_INFO = 'var(--theme-info)';
const REGION_WARNING = 'var(--theme-warning)';
const WORKFLOW_STEPS: Array<{
    id: CanvasWorkflowStep;
    label: string;
    helper: string;
}> = [
    { id: 'source', label: '1. Pick/Edit Image', helper: 'Start from the current image, extend the canvas, and move the base image before masking.' },
    { id: 'mask', label: '2. Paint Mask', helper: 'Paint only the area you want to refine. Skip this if you only need prompt regions.' },
    { id: 'regions', label: '3. Add Regions', helper: 'Use simple boxes to separate characters, clothing, and background.' },
    { id: 'segments', label: '4. Segment Assist', helper: 'Add guided segment rules for face, hair, clothing, or background cleanup.' },
    { id: 'generate', label: '5. Generate / Upscale', helper: 'Send compatible data back into the standard generation and upscale flows.' },
];

// ============================================================================
// Canvas Editor Component
// ============================================================================

export const CanvasEditor = memo(function CanvasEditor({
    imageUrl,
    onMaskChange,
    onClose,
    onApply,
    mode = 'inpaint',
    workflowStep = 'source',
    onWorkflowStepChange,
    onApplyToGenerate,
    onGenerateFromCanvas,
    onOpenUpscaler,
    pendingResult,
    onUsePendingResult,
    onContinueRefining,
    clearMaskVersion = 0,
}: CanvasEditorProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
    const previousLayoutRef = useRef<{ width: number; height: number; offsetX: number; offsetY: number } | null>(null);

    const {
        currentTool,
        setTool,
        brushSettings,
        setBrushSettings,
        zoom,
        panX,
        panY,
        zoomIn,
        zoomOut,
        maskOpacity,
        setMaskOpacity,
        maskColor,
        setMaskColor,
        showMask,
        toggleMaskVisibility,
        activeRegionId,
        showRegions,
        canvasWidth,
        canvasHeight,
        originalWidth,
        originalHeight,
        imageOffsetX,
        imageOffsetY,
        openEditor,
    } = useCanvasEditorStore();

    const regions = usePromptBuilderStore((state) => state.regions);
    const segments = usePromptBuilderStore((state) => state.segments);
    const syncState = usePromptBuilderStore((state) => state.syncState);
    const setSourceContext = usePromptBuilderStore((state) => state.setSourceContext);
    const applyFromCanvas = usePromptBuilderStore((state) => state.applyFromCanvas);
    const activeRegion = regions.find((region) => region.id === activeRegionId) ?? null;

    const {
        canvasRef,
        maskCanvasRef,
        containerRef,
        canUndo,
        canRedo,
        startDrawing,
        draw,
        stopDrawing,
        clearMask,
        fillMask,
        invertMask,
        getMaskDataUrl,
        undo,
        redo,
        handleWheel,
        handlePanStart,
        handlePan,
        handlePanEnd,
        isPanning,
        regionDraft,
    } = useCanvasEditor();

    const isWorkflowMode = mode === 'workflow';
    const supportsPromptBuilder = mode === 'regional' || isWorkflowMode;
    const title = isWorkflowMode
        ? 'Canvas Workflow'
        : mode === 'inpaint'
            ? 'Inpaint Editor'
            : mode === 'outpaint'
                ? 'Outpaint Editor'
                : 'Regional Prompt Editor';

    useEffect(() => {
        setImageLoaded(false);
        setImageElement(null);
        previousLayoutRef.current = null;

        const img = new window.Image();
        let triedWithCors = false;

        img.onload = () => {
            setImageElement(img);
            setImageLoaded(true);
            openEditor(imageUrl, img.width, img.height);
        };

        img.onerror = () => {
            if (!triedWithCors) {
                triedWithCors = true;
                img.crossOrigin = 'anonymous';
                img.src = imageUrl;
            } else {
                console.error('Failed to load image:', imageUrl);
            }
        };

        img.src = imageUrl;
    }, [imageUrl, openEditor]);

    useEffect(() => {
        if (!imageLoaded) {
            return;
        }
        setSourceContext({
            imageUrl,
            imageWidth: canvasWidth,
            imageHeight: canvasHeight,
        });
    }, [canvasHeight, canvasWidth, imageLoaded, imageUrl, setSourceContext]);

    useEffect(() => {
        if (!imageElement || !canvasRef.current || !maskCanvasRef.current) {
            return;
        }

        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        const previousLayout = previousLayoutRef.current;
        let previousMaskCanvas: HTMLCanvasElement | null = null;

        if (previousLayout && maskCanvas.width > 0 && maskCanvas.height > 0) {
            previousMaskCanvas = document.createElement('canvas');
            previousMaskCanvas.width = maskCanvas.width;
            previousMaskCanvas.height = maskCanvas.height;
            const previousMaskContext = previousMaskCanvas.getContext('2d');
            if (previousMaskContext) {
                previousMaskContext.drawImage(maskCanvas, 0, 0);
            }
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const canvasContext = canvas.getContext('2d');
        if (canvasContext) {
            canvasContext.clearRect(0, 0, canvas.width, canvas.height);
            canvasContext.drawImage(imageElement, imageOffsetX, imageOffsetY);
        }

        maskCanvas.width = canvasWidth;
        maskCanvas.height = canvasHeight;
        const maskContext = maskCanvas.getContext('2d');
        if (maskContext) {
            maskContext.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
            if (previousMaskCanvas && previousLayout) {
                maskContext.drawImage(
                    previousMaskCanvas,
                    imageOffsetX - previousLayout.offsetX,
                    imageOffsetY - previousLayout.offsetY,
                );
            }
        }

        previousLayoutRef.current = {
            width: canvasWidth,
            height: canvasHeight,
            offsetX: imageOffsetX,
            offsetY: imageOffsetY,
        };
    }, [canvasHeight, canvasWidth, imageElement, imageOffsetX, imageOffsetY]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'b':
                    setTool('brush');
                    break;
                case 'e':
                    setTool('eraser');
                    break;
                case 'h':
                case ' ':
                    setTool('pan');
                    break;
                case 'r':
                    setTool('region');
                    break;
                case 'c':
                    setTool('crop');
                    break;
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        if (e.shiftKey) {
                            redo();
                        } else {
                            undo();
                        }
                    }
                    break;
                case '[':
                    setBrushSettings({ size: Math.max(1, brushSettings.size - 10) });
                    break;
                case ']':
                    setBrushSettings({ size: Math.min(200, brushSettings.size + 10) });
                    break;
                case 'escape':
                    onClose?.();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [setTool, undo, redo, setBrushSettings, brushSettings.size, onClose]);

    useEffect(() => {
        if (!clearMaskVersion) {
            return;
        }
        clearMask();
    }, [clearMask, clearMaskVersion]);

    // Handle apply
    const buildApplyPayload = useCallback((): CanvasApplyPayload => {
        const maskDataUrl = getMaskDataUrl();
        const hasOutpaintCanvas = canvasWidth !== originalWidth
            || canvasHeight !== originalHeight
            || imageOffsetX !== 0
            || imageOffsetY !== 0;
        let initImageDataUrl: string | undefined;
        if (canvasRef.current) {
            try {
                initImageDataUrl = canvasRef.current.toDataURL('image/png');
            } catch (error) {
                console.warn('Failed to export canvas snapshot, falling back to source image.', error);
            }
        }
        const compiled = supportsPromptBuilder
            ? compilePromptBuilder({ regions, segments })
            : { managedBlock: '', blockHash: '', managedLines: [], hasContent: false, regionCount: 0, segmentCount: 0 };
        return {
            mode: mode === 'workflow' ? 'regional' : mode,
            sourceImageUrl: imageUrl,
            sourceImageWidth: canvasWidth,
            sourceImageHeight: canvasHeight,
            initImageDataUrl,
            maskDataUrl,
            hasMask: !!maskDataUrl,
            hasOutpaintCanvas,
            regions,
            segments,
            managedBlock: compiled.managedBlock,
            managedBlockHash: compiled.blockHash,
            syncState: supportsPromptBuilder ? 'synced' : syncState,
        };
    }, [
        canvasHeight,
        canvasRef,
        canvasWidth,
        getMaskDataUrl,
        imageOffsetX,
        imageOffsetY,
        imageUrl,
        mode,
        originalHeight,
        originalWidth,
        regions,
        segments,
        supportsPromptBuilder,
        syncState,
    ]);

    const handleApply = useCallback(() => {
        const payload = buildApplyPayload();
        onMaskChange?.(payload.maskDataUrl);

        if (supportsPromptBuilder) {
            applyFromCanvas(payload);
        }
        onApply?.(payload);
        return payload;
    }, [applyFromCanvas, buildApplyPayload, onApply, onMaskChange, supportsPromptBuilder]);

    const handleWorkflowAction = useCallback((action: 'apply' | 'generate') => {
        const payload = handleApply();
        if (action === 'apply') {
            onApplyToGenerate?.(payload);
        } else {
            onGenerateFromCanvas?.(payload);
        }
    }, [handleApply, onApplyToGenerate, onGenerateFromCanvas]);

    // Get cursor style
    const getCursor = () => {
        if (isPanning) return 'grabbing';
        switch (currentTool) {
            case 'pan':
                return 'grab';
            case 'brush':
            case 'eraser':
                return 'crosshair';
            case 'crop':
                return 'move';
            case 'region':
                return 'crosshair';
            default:
                return 'default';
        }
    };

    const canvasPixelWidth = canvasWidth;
    const canvasPixelHeight = canvasHeight;
    const hasOutpaintCanvas = canvasWidth !== originalWidth
        || canvasHeight !== originalHeight
        || imageOffsetX !== 0
        || imageOffsetY !== 0;
    const showOutpaintControls = mode === 'outpaint'
        || (isWorkflowMode && workflowStep === 'source')
        || hasOutpaintCanvas;
    const activeWorkflowStep = WORKFLOW_STEPS.find((step) => step.id === workflowStep) ?? WORKFLOW_STEPS[0];
    const primaryWorkflowAction = isWorkflowMode
        ? (() => {
            switch (workflowStep) {
                case 'source':
                    return { label: 'Start Masking', action: () => onWorkflowStepChange?.('mask') };
                case 'mask':
                    return { label: 'Review Regions', action: () => onWorkflowStepChange?.('regions') };
                case 'regions':
                    return { label: 'Open Segment Assist', action: () => onWorkflowStepChange?.('segments') };
                case 'segments':
                    return { label: 'Review Generate Actions', action: () => onWorkflowStepChange?.('generate') };
                case 'generate':
                    return null;
                default:
                    return null;
            }
        })()
        : null;
    const hasPromptContent = supportsPromptBuilder && (regions.length > 0 || segments.length > 0);
    const regionSummary = activeRegion?.label?.trim() || activeRegion?.prompt.trim().split(/\s+/).slice(0, 3).join(' ') || null;

    return (
        <Box
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'color-mix(in srgb, var(--theme-gray-9) 92%, black)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Header */}
            <Paper
                p="xs"
                radius={0}
                style={{
                    borderBottom: '1px solid var(--mantine-color-invokeGray-7)',
                    backgroundColor: 'var(--mantine-color-invokeGray-9)',
                }}
            >
                <Group justify="space-between">
                    <Group gap="md">
                        <Text fw={600} c="invokeGray.0">
                            {title}
                        </Text>
                        <Text size="sm" c="invokeGray.4">
                            {Math.round(zoom * 100)}%
                        </Text>
                        {isWorkflowMode && (
                            <Badge color="invokeBrand" variant="light">
                                Guided Workflow
                            </Badge>
                        )}
                    </Group>

                    <Group gap="xs">
                        <Button
                            variant="light"
                            color="gray"
                            size="xs"
                            leftSection={<IconX size={14} />}
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="filled"
                            color="invokeBrand"
                            size="xs"
                            leftSection={<IconCheck size={14} />}
                            onClick={handleApply}
                        >
                            {isWorkflowMode ? 'Sync Workspace' : 'Apply Mask'}
                        </Button>
                    </Group>
                </Group>
            </Paper>

            <Box style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* Left Toolbar */}
                <Paper
                    p="xs"
                    radius={0}
                    style={{
                        width: 48,
                        borderRight: '1px solid var(--mantine-color-invokeGray-7)',
                        backgroundColor: 'var(--mantine-color-invokeGray-9)',
                    }}
                >
                    <Stack gap="xs" align="center">
                        {TOOLS.map((tool) => (
                            <Tooltip key={tool.id} label={`${tool.label} (${tool.shortcut})`} position="right">
                                <ActionIcon
                                    size="lg"
                                    variant={currentTool === tool.id ? 'filled' : 'subtle'}
                                    color={currentTool === tool.id ? 'invokeBrand' : 'gray'}
                                    onClick={() => setTool(tool.id)}
                                >
                                    <tool.icon size={20} />
                                </ActionIcon>
                            </Tooltip>
                        ))}

                        <Divider w="100%" my="xs" color="invokeGray.7" />

                        <Tooltip label="Undo (Ctrl+Z)" position="right">
                            <ActionIcon
                                size="lg"
                                variant="subtle"
                                color="gray"
                                disabled={!canUndo}
                                onClick={undo}
                            >
                                <IconArrowBackUp size={20} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Redo (Ctrl+Shift+Z)" position="right">
                            <ActionIcon
                                size="lg"
                                variant="subtle"
                                color="gray"
                                disabled={!canRedo}
                                onClick={redo}
                            >
                                <IconArrowForwardUp size={20} />
                            </ActionIcon>
                        </Tooltip>

                        <Divider w="100%" my="xs" color="invokeGray.7" />

                        <Tooltip label="Zoom In" position="right">
                            <ActionIcon size="lg" variant="subtle" color="gray" onClick={zoomIn}>
                                <IconZoomIn size={20} />
                            </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Zoom Out" position="right">
                            <ActionIcon size="lg" variant="subtle" color="gray" onClick={zoomOut}>
                                <IconZoomOut size={20} />
                            </ActionIcon>
                        </Tooltip>
                    </Stack>
                </Paper>

                {/* Canvas Area */}
                <Box
                    ref={containerRef}
                    style={{
                        flex: 1,
                        overflow: 'hidden',
                        position: 'relative',
                        cursor: getCursor(),
                        backgroundColor: 'var(--mantine-color-invokeGray-10)',
                        backgroundImage: 'linear-gradient(45deg, color-mix(in srgb, var(--theme-gray-8) 92%, transparent) 25%, transparent 25%), linear-gradient(-45deg, color-mix(in srgb, var(--theme-gray-8) 92%, transparent) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, color-mix(in srgb, var(--theme-gray-8) 92%, transparent) 75%), linear-gradient(-45deg, transparent 75%, color-mix(in srgb, var(--theme-gray-8) 92%, transparent) 75%)',
                        backgroundSize: '24px 24px',
                        backgroundPosition: '0 0, 0 12px, 12px -12px, -12px 0px',
                    }}
                    onWheel={handleWheel}
                    onMouseDown={(e) => {
                        handlePanStart(e);
                        if (currentTool !== 'pan') {
                            startDrawing(e);
                        }
                    }}
                    onMouseMove={(e) => {
                        handlePan(e);
                        if (currentTool !== 'pan') {
                            draw(e);
                        }
                    }}
                    onMouseUp={() => {
                        handlePanEnd();
                        stopDrawing();
                    }}
                    onMouseLeave={() => {
                        handlePanEnd();
                        stopDrawing();
                    }}
                >
                    <Box
                        style={{
                            position: 'absolute',
                            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                            transformOrigin: '0 0',
                        }}
                    >
                        {/* Background canvas (image) */}
                        <canvas
                            ref={canvasRef}
                            style={{
                                display: 'block',
                                boxShadow: '0 0 20px color-mix(in srgb, black 50%, transparent)',
                            }}
                        />

                        <Box
                            style={{
                                position: 'absolute',
                                left: imageOffsetX,
                                top: imageOffsetY,
                                width: originalWidth,
                                height: originalHeight,
                                border: '1px solid color-mix(in srgb, var(--theme-brand) 42%, white)',
                                boxShadow: '0 0 0 1px color-mix(in srgb, black 32%, transparent)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Mask canvas (overlay) */}
                        <canvas
                            ref={maskCanvasRef}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                opacity: showMask ? maskOpacity : 0,
                                pointerEvents: 'none',
                            }}
                        />

                        {supportsPromptBuilder && showRegions && canvasPixelWidth > 0 && canvasPixelHeight > 0 && regions.map((region, index) => {
                            if (region.shape !== 'rectangle') {
                                return null;
                            }
                            const rect = normalizedRegionToPixels(region, canvasPixelWidth, canvasPixelHeight);
                            const isActive = activeRegionId === region.id;
                            const label = region.label?.trim() || region.prompt.trim().split(/\s+/).slice(0, 3).join(' ') || (region.useInpaint ? `Object ${index + 1}` : `Region ${index + 1}`);
                            return (
                                <Box
                                    key={region.id}
                                    style={{
                                        position: 'absolute',
                                        left: rect.x,
                                        top: rect.y,
                                        width: rect.width,
                                        height: rect.height,
                                        border: `2px ${isActive ? 'solid' : 'dashed'} ${region.useInpaint ? REGION_WARNING : REGION_INFO}`,
                                        backgroundColor: region.useInpaint
                                            ? 'color-mix(in srgb, var(--theme-warning) 16%, transparent)'
                                            : 'color-mix(in srgb, var(--theme-info) 14%, transparent)',
                                        pointerEvents: 'none',
                                        opacity: region.enabled ? 1 : 0.45,
                                    }}
                                >
                                    <Box
                                        style={{
                                            position: 'absolute',
                                            top: -18,
                                            left: 0,
                                            fontSize: 11,
                                            lineHeight: '12px',
                                            padding: '2px 4px',
                                            borderRadius: 4,
                                            color: 'var(--theme-gray-0)',
                                            background: isActive ? 'var(--theme-info)' : 'var(--theme-gray-7)',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {label}
                                    </Box>
                                    {isActive && (
                                        <>
                                            {[
                                                { left: -5, top: -5 },
                                                { left: rect.width / 2 - 5, top: -5 },
                                                { left: rect.width - 5, top: -5 },
                                                { left: -5, top: rect.height / 2 - 5 },
                                                { left: rect.width - 5, top: rect.height / 2 - 5 },
                                                { left: -5, top: rect.height - 5 },
                                                { left: rect.width / 2 - 5, top: rect.height - 5 },
                                                { left: rect.width - 5, top: rect.height - 5 },
                                            ].map((handle, handleIndex) => (
                                                <Box
                                                    key={`${region.id}-handle-${handleIndex}`}
                                                    style={{
                                                        position: 'absolute',
                                                        left: handle.left,
                                                        top: handle.top,
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: 999,
                                                        background: 'var(--theme-gray-0)',
                                                        border: `2px solid ${region.useInpaint ? REGION_WARNING : REGION_INFO}`,
                                                        boxShadow: '0 0 0 1px color-mix(in srgb, black 30%, transparent)',
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}
                                </Box>
                            );
                        })}

                        {supportsPromptBuilder && regionDraft && (
                            <Box
                                style={{
                                    position: 'absolute',
                                    left: Math.min(regionDraft.x1, regionDraft.x2),
                                    top: Math.min(regionDraft.y1, regionDraft.y2),
                                    width: Math.abs(regionDraft.x2 - regionDraft.x1),
                                    height: Math.abs(regionDraft.y2 - regionDraft.y1),
                                    border: '2px dashed var(--theme-info)',
                                    backgroundColor: 'color-mix(in srgb, var(--theme-info) 12%, transparent)',
                                    pointerEvents: 'none',
                                }}
                            />
                        )}
                    </Box>

                    {/* Loading state */}
                    {!imageLoaded && (
                        <Box
                            style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                            }}
                        >
                            <Text c="invokeGray.3">Loading image...</Text>
                        </Box>
                    )}
                </Box>

                {/* Right Panel - Brush Settings */}
                <Paper
                    p="sm"
                    radius={0}
                    style={{
                        width: supportsPromptBuilder ? 380 : 240,
                        borderLeft: '1px solid var(--mantine-color-invokeGray-7)',
                        backgroundColor: 'var(--mantine-color-invokeGray-9)',
                    }}
                >
                    <ScrollArea h="100%" offsetScrollbars>
                        <Stack gap="md">
                            {isWorkflowMode && (
                                <>
                                    <Paper p="sm" radius="md" bg="invokeGray.8" withBorder>
                                        <Stack gap="xs">
                                            <Text size="sm" fw={600} c="invokeGray.0">
                                                Easy Workflow
                                            </Text>
                                            {WORKFLOW_STEPS.map((step, index) => {
                                                const isActive = step.id === workflowStep;
                                                return (
                                                    <Button
                                                        key={step.id}
                                                        justify="flex-start"
                                                        variant={isActive ? 'filled' : 'subtle'}
                                                        color={isActive ? 'invokeBrand' : 'gray'}
                                                        onClick={() => onWorkflowStepChange?.(step.id)}
                                                    >
                                                        {index + 1}. {step.label.replace(/^\d+\.\s*/, '')}
                                                    </Button>
                                                );
                                            })}
                                            <Paper p="xs" radius="sm" bg="invokeGray.9" withBorder>
                                                <Text size="xs" fw={600} c="invokeGray.1" mb={4}>
                                                    {activeWorkflowStep.label}
                                                </Text>
                                                <Text size="xs" c="invokeGray.4">
                                                    {activeWorkflowStep.helper}
                                                </Text>
                                                {primaryWorkflowAction && (
                                                    <Button
                                                        size="xs"
                                                        variant="light"
                                                        mt="sm"
                                                        onClick={primaryWorkflowAction.action}
                                                    >
                                                        {primaryWorkflowAction.label}
                                                    </Button>
                                                )}
                                            </Paper>
                                        </Stack>
                                    </Paper>
                                    <Paper p="sm" radius="md" bg="invokeGray.8" withBorder>
                                        <Stack gap="xs">
                                            <Text size="sm" fw={600} c="invokeGray.0">
                                                Current Focus
                                            </Text>
                                            <Text size="xs" c="invokeGray.4">
                                                {workflowStep === 'source'
                                                    ? 'Use your current image as the base, extend the checkerboard workspace, and move the image before you start masking.'
                                                    : workflowStep === 'mask'
                                                        ? 'Paint over only the parts you want to refine. Clear the mask if you want to start over.'
                                                        : workflowStep === 'regions'
                                                            ? 'Draw simple boxes around character or scene areas, then label them clearly.'
                                                            : workflowStep === 'segments'
                                                                ? 'Use segment helpers for face, hair, clothing, or background cleanup.'
                                                                : 'Choose whether to sync, generate, upscale, or continue refining from a new result.'}
                                            </Text>
                                            {regionSummary && workflowStep === 'regions' && (
                                                <Badge color="blue" variant="light">
                                                    Active Region: {regionSummary}
                                                </Badge>
                                            )}
                                        </Stack>
                                    </Paper>
                                </>
                            )}

                            {showOutpaintControls && (
                                <>
                                    <OutpaintControls />
                                    <Divider color="invokeGray.7" />
                                </>
                            )}

                            {supportsPromptBuilder && (
                                <>
                                    <Group justify="space-between">
                                        <Text size="sm" fw={500} c="invokeGray.1">
                                            Prompt Builder
                                        </Text>
                                        <Badge
                                            color={
                                                syncState === 'synced'
                                                    ? 'green'
                                                    : syncState === 'manual_override'
                                                        ? 'yellow'
                                                        : 'gray'
                                            }
                                            variant="light"
                                        >
                                            {syncState.replace('_', ' ')}
                                        </Badge>
                                    </Group>
                                    {(workflowStep === 'regions' || workflowStep === 'source' || workflowStep === 'mask') && (
                                        <RegionalPromptEditor />
                                    )}
                                    {(workflowStep === 'segments' || workflowStep === 'generate') && (
                                        <SegmentRulesPanel />
                                    )}
                                    {workflowStep === 'regions' && !hasPromptContent && (
                                        <Text size="xs" c="invokeGray.4">
                                            Tip: label regions with simple names like Character A or Background so it stays easy to track.
                                        </Text>
                                    )}
                                    <Divider color="invokeGray.7" />
                                </>
                            )}

                        <Box>
                            <Text size="sm" fw={500} c="invokeGray.1" mb="xs">
                                Brush Size: {brushSettings.size}px
                            </Text>
                            <Slider
                                value={brushSettings.size}
                                onChange={(value) => setBrushSettings({ size: value })}
                                min={1}
                                max={200}
                                color="invokeBrand"
                            />
                            <Group gap="xs" mt="xs">
                                {BRUSH_SIZES.map((size) => (
                                    <ActionIcon
                                        key={size}
                                        size="sm"
                                        variant={brushSettings.size === size ? 'filled' : 'light'}
                                        color={brushSettings.size === size ? 'invokeBrand' : 'gray'}
                                        onClick={() => setBrushSettings({ size })}
                                    >
                                        <Text size="xs">{size}</Text>
                                    </ActionIcon>
                                ))}
                            </Group>
                        </Box>

                        <Divider color="invokeGray.7" />

                        {(workflowStep !== 'source' || !isWorkflowMode) && (
                            <Box>
                                <Text size="sm" fw={500} c="invokeGray.1" mb="xs">
                                    Mask Opacity: {Math.round(maskOpacity * 100)}%
                                </Text>
                                <Slider
                                    value={maskOpacity}
                                    onChange={setMaskOpacity}
                                    min={0.1}
                                    max={1}
                                    step={0.1}
                                    color="invokeBrand"
                                />
                            </Box>
                        )}

                        <Divider color="invokeGray.7" />

                        <Box>
                            <Text size="sm" fw={500} c="invokeGray.1" mb="xs">
                                Mask Color
                            </Text>
                            <Group gap="xs">
                                {MASK_COLORS.map((color) => (
                                    <ColorSwatch
                                        key={color}
                                        color={color}
                                        size={24}
                                        style={{
                                            cursor: 'pointer',
                                            border: maskColor === color ? '2px solid white' : 'none',
                                        }}
                                        onClick={() => setMaskColor(color)}
                                    />
                                ))}
                            </Group>
                        </Box>

                        <Divider color="invokeGray.7" />

                        <Box>
                            <Text size="sm" fw={500} c="invokeGray.1" mb="xs">
                                Mask Actions
                            </Text>
                            <Stack gap="xs">
                                <Button
                                    variant="light"
                                    size="xs"
                                    fullWidth
                                    leftSection={<IconPaint size={14} />}
                                    onClick={fillMask}
                                >
                                    Fill Mask
                                </Button>
                                <Button
                                    variant="light"
                                    size="xs"
                                    fullWidth
                                    leftSection={<IconTrash size={14} />}
                                    onClick={clearMask}
                                >
                                    Clear Mask
                                </Button>
                                <Button
                                    variant="light"
                                    size="xs"
                                    fullWidth
                                    leftSection={<IconSwitchHorizontal size={14} />}
                                    onClick={invertMask}
                                >
                                    Invert Mask
                                </Button>
                                <Button
                                    variant="light"
                                    size="xs"
                                    fullWidth
                                    onClick={toggleMaskVisibility}
                                >
                                    {showMask ? 'Hide Mask' : 'Show Mask'}
                                </Button>
                            </Stack>
                        </Box>

                        {isWorkflowMode && (
                            <>
                                <Divider color="invokeGray.7" />

                                <Box>
                                    <Text size="sm" fw={500} c="invokeGray.1" mb="xs">
                                        Generate Actions
                                    </Text>
                                    <Stack gap="xs">
                                        <Button
                                            variant="light"
                                            size="xs"
                                            fullWidth
                                            onClick={() => handleWorkflowAction('apply')}
                                        >
                                            Apply to Generate
                                        </Button>
                                        <Button
                                            variant="filled"
                                            color="invokeBrand"
                                            size="xs"
                                            fullWidth
                                            disabled={!getMaskDataUrl()}
                                            onClick={() => handleWorkflowAction('generate')}
                                        >
                                            Generate Inpaint
                                        </Button>
                                        <Button
                                            variant="light"
                                            size="xs"
                                            fullWidth
                                            onClick={onOpenUpscaler}
                                        >
                                            Open Upscaler
                                        </Button>
                                        <Text size="xs" c="invokeGray.4">
                                            Only compatibility-safe fields are sent: init image, mask image, and the existing managed builder block.
                                        </Text>
                                    </Stack>
                                </Box>

                                {pendingResult && (
                                    <Paper p="sm" radius="md" bg="invokeGray.8" withBorder>
                                        <Stack gap="xs">
                                            <Group justify="space-between">
                                                <Text size="sm" fw={600} c="invokeGray.0">
                                                    New Result Ready
                                                </Text>
                                                <Badge color={pendingResult.source === 'upscale' ? 'teal' : 'green'} variant="light">
                                                    {pendingResult.source === 'upscale' ? 'Upscale' : 'Generate'}
                                                </Badge>
                                            </Group>
                                            <img
                                                src={pendingResult.imageUrl}
                                                alt="Pending workflow result"
                                                style={{
                                                    width: '100%',
                                                    borderRadius: 8,
                                                    border: '1px solid var(--mantine-color-invokeGray-7)',
                                                }}
                                            />
                                            <Group grow>
                                                <Button size="xs" variant="light" onClick={onUsePendingResult}>
                                                    Use Result
                                                </Button>
                                                <Button size="xs" onClick={onContinueRefining}>
                                                    Continue Refining
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </Paper>
                                )}
                            </>
                        )}

                        <Divider color="invokeGray.7" />

                        <Box>
                            <Text size="xs" c="invokeGray.4">
                                <strong>Shortcuts:</strong><br />
                                B - Brush<br />
                                E - Eraser<br />
                                H/Space - Pan<br />
                                R - Region Draw/Select<br />
                                [ / ] - Brush size<br />
                                Ctrl+Z - Undo<br />
                                Scroll - Zoom
                            </Text>
                        </Box>
                        </Stack>
                    </ScrollArea>
                </Paper>
            </Box>
        </Box>
    );
});

export default CanvasEditor;
