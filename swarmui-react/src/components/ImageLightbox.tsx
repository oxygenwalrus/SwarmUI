import { useState, useCallback, useEffect, useRef } from 'react';
import {
    Box,
    Group,
    Text,
    Paper,
    Stack,
    ScrollArea,
    Code,
    Tooltip,
} from '@mantine/core';
import {
    IconX,
    IconChevronLeft,
    IconChevronRight,
    IconZoomIn,
    IconZoomOut,
    IconZoomReset,
    IconInfoCircle,
    IconInfoCircleFilled,
    IconColumns,
    IconLayersSubtract,
    IconDownload,
} from '@tabler/icons-react';
import { useImagePreloader } from '../hooks/useImagePreloader';
import { SwarmActionIcon, SwarmBadge, SwarmSegmentedControl, SwarmSlider } from './ui';

interface ImageLightboxProps {
    /** Whether the lightbox is open */
    opened: boolean;
    /** Array of image URLs */
    images: string[];
    /** Currently displayed image index */
    currentIndex: number;
    /** Image metadata (optional) */
    metadata?: ImageMetadata;
    /** Optional second image for comparison mode */
    comparisonImage?: string | null;
    /** Callback when lightbox is closed */
    onClose: () => void;
    /** Callback when navigating to different image */
    onNavigate: (index: number) => void;
}

type ComparisonMode = 'off' | 'side-by-side' | 'overlay';

interface ImageMetadata {
    [key: string]: unknown;
    prompt?: string;
    negativeprompt?: string;
    model?: string;
    seed?: string | number;
    steps?: string | number;
    cfgscale?: string | number;
    width?: string | number;
    height?: string | number;
    sampler?: string;
}

/**
 * Full-screen image lightbox with zoom, pan, and comparison features.
 */
export function ImageLightbox({
    opened,
    images,
    currentIndex,
    metadata,
    comparisonImage,
    onClose,
    onNavigate,
}: ImageLightboxProps) {
    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // UI state
    const [showMetadata, setShowMetadata] = useState(false);
    const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('off');
    const [overlayOpacity, setOverlayOpacity] = useState(0.5);

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);

    // Image preloading for instant navigation
    const { preloadAdjacent } = useImagePreloader(images, { preloadCount: 2 });

    const currentImage = images[currentIndex] || null;

    // Reset zoom/pan when image changes
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            setZoom(1);
            setPosition({ x: 0, y: 0 });
        });
        return () => cancelAnimationFrame(frame);
    }, [currentIndex]);

    // Preload adjacent images when current index changes
    useEffect(() => {
        if (opened && images.length > 1) {
            preloadAdjacent(currentIndex);
        }
    }, [opened, currentIndex, images.length, preloadAdjacent]);

    // Keyboard navigation
    useEffect(() => {
        if (!opened) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onClose();
                    break;
                case 'ArrowLeft':
                    if (currentIndex > 0) onNavigate(currentIndex - 1);
                    break;
                case 'ArrowRight':
                    if (currentIndex < images.length - 1) onNavigate(currentIndex + 1);
                    break;
                case '+':
                case '=':
                    setZoom(z => Math.min(z + 0.5, 5));
                    break;
                case '-':
                    setZoom(z => Math.max(z - 0.5, 0.5));
                    break;
                case '0':
                    setZoom(1);
                    setPosition({ x: 0, y: 0 });
                    break;
                case 'i':
                    setShowMetadata(m => !m);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [opened, currentIndex, images.length, onClose, onNavigate]);

    // Handle scroll wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.2 : 0.2;
        setZoom(z => Math.min(Math.max(z + delta, 0.5), 5));
    }, []);

    // Handle drag start
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (zoom <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }, [zoom, position]);

    // Handle drag move
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);

    // Handle drag end
    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Zoom controls
    const zoomIn = () => setZoom(z => Math.min(z + 0.5, 5));
    const zoomOut = () => setZoom(z => Math.max(z - 0.5, 0.5));
    const resetZoom = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    if (!opened || !currentImage) return null;

    return (
        <Box
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                display: 'flex',
                animation: 'fadeIn 200ms ease',
            }}
        >
            {/* Main image area */}
            <Box
                ref={containerRef}
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                    position: 'relative',
                }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Close button */}
                <SwarmActionIcon
                    tone="secondary"
                    emphasis="solid"
                    size="lg"
                    radius="xl"
                    label="Close lightbox"
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        zIndex: 10,
                    }}
                >
                    <IconX size={20} />
                </SwarmActionIcon>

                {/* Navigation arrows */}
                {currentIndex > 0 && (
                    <SwarmActionIcon
                        tone="secondary"
                        emphasis="solid"
                        size="xl"
                        radius="xl"
                        label="Previous image"
                        onClick={() => onNavigate(currentIndex - 1)}
                        style={{
                            position: 'absolute',
                            left: 16,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10,
                        }}
                    >
                        <IconChevronLeft size={24} />
                    </SwarmActionIcon>
                )}

                {currentIndex < images.length - 1 && (
                    <SwarmActionIcon
                        tone="secondary"
                        emphasis="solid"
                        size="xl"
                        radius="xl"
                        label="Next image"
                        onClick={() => onNavigate(currentIndex + 1)}
                        style={{
                            position: 'absolute',
                            right: showMetadata ? 316 : 16,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 10,
                            transition: 'right 200ms ease',
                        }}
                    >
                        <IconChevronRight size={24} />
                    </SwarmActionIcon>
                )}

                {/* Image display */}
                {comparisonMode === 'off' && (
                    <img
                        src={currentImage}
                        alt="Lightbox view"
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            objectFit: 'contain',
                            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                            transition: isDragging ? 'none' : 'transform 150ms ease',
                            userSelect: 'none',
                            pointerEvents: 'none',
                        }}
                        draggable={false}
                    />
                )}

                {/* Side-by-side comparison */}
                {comparisonMode === 'side-by-side' && comparisonImage && (
                    <Group gap="md" align="center" justify="center" style={{ height: '100%' }}>
                        <img
                            src={currentImage}
                            alt="Image A"
                            style={{
                                maxWidth: '45%',
                                maxHeight: '85%',
                                objectFit: 'contain',
                                border: '2px solid var(--theme-brand)',
                                borderRadius: 8,
                            }}
                            draggable={false}
                        />
                        <img
                            src={comparisonImage}
                            alt="Image B"
                            style={{
                                maxWidth: '45%',
                                maxHeight: '85%',
                                objectFit: 'contain',
                                border: '2px solid var(--theme-accent)',
                                borderRadius: 8,
                            }}
                            draggable={false}
                        />
                    </Group>
                )}

                {/* Overlay comparison */}
                {comparisonMode === 'overlay' && comparisonImage && (
                    <Box style={{ position: 'relative' }}>
                        <img
                            src={currentImage}
                            alt="Base image"
                            style={{
                                maxWidth: '90%',
                                maxHeight: '85vh',
                                objectFit: 'contain',
                            }}
                            draggable={false}
                        />
                        <img
                            src={comparisonImage}
                            alt="Overlay image"
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                maxWidth: '90%',
                                maxHeight: '85vh',
                                objectFit: 'contain',
                                opacity: overlayOpacity,
                            }}
                            draggable={false}
                        />
                    </Box>
                )}

                {/* Bottom toolbar */}
                <Paper
                    p="xs"
                    radius="md"
                    style={{
                        position: 'absolute',
                        bottom: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'color-mix(in srgb, var(--theme-gray-9) 72%, transparent)',
                        backdropFilter: 'blur(var(--theme-blur-strength))',
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                    }}
                >
                    {/* Image counter */}
                    <Text size="sm" style={{ minWidth: 60, textAlign: 'center', color: 'var(--theme-gray-2)' }}>
                        {currentIndex + 1} / {images.length}
                    </Text>

                    <Box style={{ width: 1, height: 24, backgroundColor: 'var(--theme-gray-5)' }} />

                    {/* Zoom controls */}
                    <Group gap={4}>
                        <Tooltip label="Zoom out (-)">
                            <SwarmActionIcon tone="secondary" emphasis="ghost" label="Zoom out" onClick={zoomOut}>
                                <IconZoomOut size={18} />
                            </SwarmActionIcon>
                        </Tooltip>
                        <Text size="xs" style={{ minWidth: 45, textAlign: 'center', color: 'var(--theme-gray-2)' }}>
                            {Math.round(zoom * 100)}%
                        </Text>
                        <Tooltip label="Zoom in (+)">
                            <SwarmActionIcon tone="secondary" emphasis="ghost" label="Zoom in" onClick={zoomIn}>
                                <IconZoomIn size={18} />
                            </SwarmActionIcon>
                        </Tooltip>
                        <Tooltip label="Reset (0)">
                            <SwarmActionIcon tone="secondary" emphasis="ghost" label="Reset zoom" onClick={resetZoom}>
                                <IconZoomReset size={18} />
                            </SwarmActionIcon>
                        </Tooltip>
                    </Group>

                    <Box style={{ width: 1, height: 24, backgroundColor: 'var(--theme-gray-5)' }} />

                    {/* Comparison mode */}
                    {comparisonImage && (
                        <>
                            <SwarmSegmentedControl
                                size="xs"
                                value={comparisonMode}
                                onChange={(v) => setComparisonMode(v as ComparisonMode)}
                                data={[
                                    { value: 'off', label: 'Single' },
                                    { value: 'side-by-side', label: <IconColumns size={14} /> },
                                    { value: 'overlay', label: <IconLayersSubtract size={14} /> },
                                ]}
                            />

                            {comparisonMode === 'overlay' && (
                                <SwarmSlider
                                    value={overlayOpacity}
                                    onChange={setOverlayOpacity}
                                    min={0}
                                    max={1}
                                    step={0.1}
                                    w={80}
                                    size="xs"
                                />
                            )}

                            <Box style={{ width: 1, height: 24, backgroundColor: 'var(--theme-gray-5)' }} />
                        </>
                    )}

                    {/* Actions */}
                    <Tooltip label="Toggle metadata (I)">
                        <SwarmActionIcon
                            tone={showMetadata ? 'primary' : 'secondary'}
                            emphasis={showMetadata ? 'solid' : 'ghost'}
                            label={showMetadata ? 'Hide metadata panel' : 'Show metadata panel'}
                            onClick={() => setShowMetadata(!showMetadata)}
                        >
                            {showMetadata ? <IconInfoCircleFilled size={18} /> : <IconInfoCircle size={18} />}
                        </SwarmActionIcon>
                    </Tooltip>

                    <Tooltip label="Download">
                        <SwarmActionIcon
                            tone="info"
                            emphasis="ghost"
                            label="Open image in new tab"
                            onClick={() => window.open(currentImage, '_blank')}
                        >
                            <IconDownload size={18} />
                        </SwarmActionIcon>
                    </Tooltip>
                </Paper>
            </Box>

            {/* Metadata sidebar */}
            <Box
                style={{
                    width: showMetadata ? 300 : 0,
                    transition: 'width 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden',
                    borderLeft: showMetadata ? '1px solid var(--theme-gray-5)' : 'none',
                    backgroundColor: 'var(--theme-gray-8)',
                }}
            >
                <ScrollArea h="100%" p="md">
                    <Stack gap="md">
                        <Group justify="space-between">
                            <Text size="sm" fw={600} tt="uppercase" style={{ color: 'var(--theme-gray-0)' }}>
                                Metadata
                            </Text>
                            <SwarmActionIcon
                                tone="secondary"
                                emphasis="ghost"
                                size="sm"
                                label="Hide metadata panel"
                                onClick={() => setShowMetadata(false)}
                            >
                                <IconX size={14} />
                            </SwarmActionIcon>
                        </Group>

                        {metadata ? (
                            <>
                                {/* Common fields */}
                                {metadata.prompt && (
                                    <Box>
                                        <Text size="xs" style={{ color: 'var(--theme-gray-4)' }} mb={4}>Prompt</Text>
                                        <Text size="sm" style={{ color: 'var(--theme-gray-1)', wordBreak: 'break-word' }}>
                                            {metadata.prompt}
                                        </Text>
                                    </Box>
                                )}

                                {metadata.negativeprompt && (
                                    <Box>
                                        <Text size="xs" style={{ color: 'var(--theme-gray-4)' }} mb={4}>Negative Prompt</Text>
                                        <Text size="sm" style={{ color: 'var(--theme-gray-1)', wordBreak: 'break-word' }}>
                                            {metadata.negativeprompt}
                                        </Text>
                                    </Box>
                                )}

                                {/* Parameters grid */}
                                <Box>
                                    <Text size="xs" style={{ color: 'var(--theme-gray-4)' }} mb={8}>Parameters</Text>
                                    <Group gap="xs" wrap="wrap">
                                        {metadata.model && (
                                            <SwarmBadge size="sm" tone="secondary" emphasis="soft">Model: {metadata.model}</SwarmBadge>
                                        )}
                                        {metadata.seed !== undefined && (
                                            <SwarmBadge size="sm" tone="secondary" emphasis="soft">Seed: {metadata.seed}</SwarmBadge>
                                        )}
                                        {metadata.steps && (
                                            <SwarmBadge size="sm" tone="secondary" emphasis="soft">Steps: {metadata.steps}</SwarmBadge>
                                        )}
                                        {metadata.cfgscale && (
                                            <SwarmBadge size="sm" tone="secondary" emphasis="soft">CFG: {metadata.cfgscale}</SwarmBadge>
                                        )}
                                        {metadata.width && metadata.height && (
                                            <SwarmBadge size="sm" tone="secondary" emphasis="soft">{metadata.width}x{metadata.height}</SwarmBadge>
                                        )}
                                        {metadata.sampler && (
                                            <SwarmBadge size="sm" tone="secondary" emphasis="soft">{metadata.sampler}</SwarmBadge>
                                        )}
                                    </Group>
                                </Box>

                                {/* Raw JSON */}
                                <Box>
                                    <Text size="xs" style={{ color: 'var(--theme-gray-4)' }} mb={4}>Raw Data</Text>
                                    <Code block style={{ fontSize: 10, maxHeight: 300, overflow: 'auto' }}>
                                        {JSON.stringify(metadata, null, 2)}
                                    </Code>
                                </Box>
                            </>
                        ) : (
                            <Text size="sm" style={{ color: 'var(--theme-gray-4)' }} ta="center" py="xl">
                                No metadata available
                            </Text>
                        )}
                    </Stack>
                </ScrollArea>
            </Box>
        </Box>
    );
}


