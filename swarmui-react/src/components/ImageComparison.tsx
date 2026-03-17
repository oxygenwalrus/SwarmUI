import { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
    Modal,
    Group,
    Stack,
    Text,
    ActionIcon,
    SegmentedControl,
    Paper,
    Box,
    Slider,
    Tooltip,
} from '@mantine/core';
import {
    IconX,
    IconColumns,
    IconAdjustmentsHorizontal,
    IconZoomIn,
    IconZoomOut,
    IconZoomReset,
} from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ImageListItem } from '../api/types';

interface ImageComparisonProps {
    /** Left image for comparison */
    leftImage: ImageListItem | null;
    /** Right image for comparison */
    rightImage: ImageListItem | null;
    /** Whether the modal is open */
    opened: boolean;
    /** Callback when modal closes */
    onClose: () => void;
}

/**
 * Image comparison component with side-by-side and slider modes.
 * Allows users to compare two images using either:
 * - Side-by-side view: Images displayed next to each other
 * - Slider view: Draggable divider to reveal/hide portions of each image
 */
export const ImageComparison = memo(function ImageComparison({
    leftImage,
    rightImage,
    opened,
    onClose,
}: ImageComparisonProps) {
    const [mode, setMode] = useState<'side-by-side' | 'slider'>('side-by-side');
    const [sliderPosition, setSliderPosition] = useState(50);
    const [zoom, setZoom] = useState(100);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (opened) {
            setSliderPosition(50);
            setZoom(100);
            setMode('side-by-side');
        }
    }, [opened]);

    /**
     * Handle slider drag in slider mode
     */
    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isDragging || mode !== 'slider' || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
            setSliderPosition(percentage);
        },
        [isDragging, mode]
    );

    const handleMouseDown = useCallback(() => {
        if (mode === 'slider') {
            setIsDragging(true);
        }
    }, [mode]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    /**
     * Zoom controls
     */
    const handleZoomIn = useCallback(() => {
        setZoom((prev) => Math.min(200, prev + 25));
    }, []);

    const handleZoomOut = useCallback(() => {
        setZoom((prev) => Math.max(25, prev - 25));
    }, []);

    const handleZoomReset = useCallback(() => {
        setZoom(100);
    }, []);

    if (!leftImage || !rightImage) {
        return null;
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size="90vw"
            centered
            withCloseButton={false}
            padding={0}
            styles={{
                content: {
                    background: 'var(--theme-panel-gradient)',
                    border: '1px solid var(--theme-border-subtle)',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                },
                body: {
                    padding: 0,
                    height: '100%',
                },
            }}
        >
            <Stack gap={0} style={{ height: '85vh' }}>
                {/* Header */}
                <Paper
                    p="sm"
                    radius={0}
                    style={{
                        borderBottom: '1px solid var(--theme-border-subtle)',
                        background: 'color-mix(in srgb, var(--theme-gray-8) 86%, transparent)',
                        flexShrink: 0,
                    }}
                >
                    <Group justify="space-between">
                        <Group gap="md">
                            <Text size="sm" fw={600} c="var(--theme-text-primary)" tt="uppercase" style={{ letterSpacing: '0.08em' }}>
                                Image Comparison
                            </Text>
                            <SegmentedControl
                                size="xs"
                                value={mode}
                                onChange={(value) => setMode(value as 'side-by-side' | 'slider')}
                                data={[
                                    {
                                        value: 'side-by-side',
                                        label: (
                                            <Group gap={4}>
                                                <IconColumns size={14} />
                                                Side by Side
                                            </Group>
                                        ),
                                    },
                                    {
                                        value: 'slider',
                                        label: (
                                            <Group gap={4}>
                                                <IconAdjustmentsHorizontal size={14} />
                                                Slider
                                            </Group>
                                        ),
                                    },
                                ]}
                            />
                        </Group>

                        <Group gap="xs">
                            {/* Zoom Controls */}
                            <Tooltip label="Zoom Out">
                                <ActionIcon
                                    variant="subtle"
                                    onClick={handleZoomOut}
                                    disabled={zoom <= 25}
                                    style={{ color: 'var(--theme-text-secondary)' }}
                                >
                                    <IconZoomOut size={18} />
                                </ActionIcon>
                            </Tooltip>
                            <Text size="xs" c="var(--theme-text-secondary)" w={50} ta="center">
                                {zoom}%
                            </Text>
                            <Tooltip label="Zoom In">
                                <ActionIcon
                                    variant="subtle"
                                    onClick={handleZoomIn}
                                    disabled={zoom >= 200}
                                    style={{ color: 'var(--theme-text-secondary)' }}
                                >
                                    <IconZoomIn size={18} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Reset Zoom">
                                <ActionIcon
                                    variant="subtle"
                                    onClick={handleZoomReset}
                                    style={{ color: 'var(--theme-text-secondary)' }}
                                >
                                    <IconZoomReset size={18} />
                                </ActionIcon>
                            </Tooltip>

                            {/* Close Button */}
                            <ActionIcon
                                variant="subtle"
                                onClick={onClose}
                                ml="md"
                                style={{ color: 'var(--theme-text-secondary)' }}
                            >
                                <IconX size={20} />
                            </ActionIcon>
                        </Group>
                    </Group>
                </Paper>

                {/* Comparison View */}
                <Box
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                        flex: 1,
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: mode === 'slider' ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        userSelect: 'none',
                    }}
                >
                    <AnimatePresence mode="wait">
                        {mode === 'side-by-side' ? (
                            <motion.div
                                key="side-by-side"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    display: 'flex',
                                    height: '100%',
                                    gap: '4px',
                                    padding: '16px',
                                }}
                            >
                                {/* Left Image */}
                                <Box
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        overflow: 'auto',
                                    }}
                                >
                                    <Text size="xs" c="var(--theme-text-secondary)" mb="xs">
                                        Image A
                                    </Text>
                                    <Box
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'auto',
                                        }}
                                    >
                                        <img
                                            src={leftImage.src}
                                            alt="Left comparison"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain',
                                                transform: `scale(${zoom / 100})`,
                                                transition: 'transform 0.2s ease',
                                            }}
                                        />
                                    </Box>
                                </Box>

                                {/* Divider */}
                                <Box
                                    style={{
                                        width: '2px',
                                        backgroundColor: 'var(--theme-border-subtle)',
                                        alignSelf: 'stretch',
                                    }}
                                />

                                {/* Right Image */}
                                <Box
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        overflow: 'auto',
                                    }}
                                >
                                    <Text size="xs" c="var(--theme-text-secondary)" mb="xs">
                                        Image B
                                    </Text>
                                    <Box
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'auto',
                                        }}
                                    >
                                        <img
                                            src={rightImage.src}
                                            alt="Right comparison"
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain',
                                                transform: `scale(${zoom / 100})`,
                                                transition: 'transform 0.2s ease',
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="slider"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    height: '100%',
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '16px',
                                }}
                            >
                                {/* Container for both images */}
                                <Box
                                    style={{
                                        position: 'relative',
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Right Image (background) */}
                                    <img
                                        src={rightImage.src}
                                        alt="Right comparison"
                                        style={{
                                            display: 'block',
                                            maxWidth: '100%',
                                            maxHeight: 'calc(85vh - 100px)',
                                            objectFit: 'contain',
                                            transform: `scale(${zoom / 100})`,
                                            transition: 'transform 0.2s ease',
                                        }}
                                    />

                                    {/* Left Image (clipped overlay) */}
                                    <Box
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            overflow: 'hidden',
                                            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                                        }}
                                    >
                                        <img
                                            src={leftImage.src}
                                            alt="Left comparison"
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                transform: `scale(${zoom / 100})`,
                                                transition: 'transform 0.2s ease',
                                            }}
                                        />
                                    </Box>

                                    {/* Slider Handle */}
                                    <Box
                                        onMouseDown={handleMouseDown}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: `${sliderPosition}%`,
                                            transform: 'translateX(-50%)',
                                            width: '4px',
                                            height: '100%',
                                            background: 'var(--theme-brand-gradient)',
                                            cursor: 'ew-resize',
                                            zIndex: 10,
                                            boxShadow: '0 0 12px var(--theme-tone-primary-glow)',
                                        }}
                                    >
                                        {/* Handle Grip */}
                                        <Box
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                left: '50%',
                                                transform: 'translate(-50%, -50%)',
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: 'var(--theme-brand-gradient)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1px solid var(--theme-tone-primary-border)',
                                                boxShadow: '0 8px 20px color-mix(in srgb, var(--theme-gray-9) 38%, transparent)',
                                            }}
                                        >
                                            <IconAdjustmentsHorizontal
                                                size={20}
                                                style={{ color: 'white' }}
                                            />
                                        </Box>
                                    </Box>

                                    {/* Labels */}
                                    <Text
                                        size="xs"
                                        c="white"
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            left: 8,
                                            backgroundColor: 'color-mix(in srgb, var(--theme-gray-9) 72%, transparent)',
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            border: '1px solid color-mix(in srgb, var(--theme-gray-0) 14%, transparent)',
                                        }}
                                    >
                                        A
                                    </Text>
                                    <Text
                                        size="xs"
                                        c="white"
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            backgroundColor: 'color-mix(in srgb, var(--theme-gray-9) 72%, transparent)',
                                            padding: '2px 8px',
                                            borderRadius: 4,
                                            border: '1px solid color-mix(in srgb, var(--theme-gray-0) 14%, transparent)',
                                        }}
                                    >
                                        B
                                    </Text>
                                </Box>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Box>

                {/* Footer with slider control (only in slider mode) */}
                {mode === 'slider' && (
                    <Paper
                        p="sm"
                        radius={0}
                        style={{
                            borderTop: '1px solid var(--theme-border-subtle)',
                            background: 'color-mix(in srgb, var(--theme-gray-8) 84%, transparent)',
                            flexShrink: 0,
                        }}
                    >
                        <Group justify="center" gap="md">
                            <Text size="xs" c="var(--theme-text-secondary)">
                                Slide Position
                            </Text>
                            <Slider
                                value={sliderPosition}
                                onChange={setSliderPosition}
                                min={0}
                                max={100}
                                step={1}
                                style={{ width: 300 }}
                                marks={[
                                    { value: 0, label: 'A' },
                                    { value: 50, label: '50%' },
                                    { value: 100, label: 'B' },
                                ]}
                            />
                        </Group>
                    </Paper>
                )}
            </Stack>
        </Modal>
    );
});

ImageComparison.displayName = 'ImageComparison';
