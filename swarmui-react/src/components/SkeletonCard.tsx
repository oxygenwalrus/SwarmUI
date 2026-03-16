import { memo } from 'react';
import { Box, Group, Stack } from '@mantine/core';

interface SkeletonCardProps {
    /** Height of the card */
    height?: number;
    /** Width of the card (default: 100%) */
    width?: number | string;
    /** Show image placeholder */
    showImage?: boolean;
    /** Image placeholder height */
    imageHeight?: number;
    /** Number of text lines to show */
    textLines?: number;
    /** Border radius */
    radius?: number;
}

/**
 * Skeleton card component with shimmer animation for loading states.
 * Uses the existing shimmer keyframe from index.css.
 */
export const SkeletonCard = memo(function SkeletonCard({
    height,
    width = '100%',
    showImage = true,
    imageHeight = 120,
    textLines = 2,
    radius = 8,
}: SkeletonCardProps) {
    const shimmerStyle = {
        background: 'linear-gradient(90deg, var(--mantine-color-invokeGray-7) 25%, var(--mantine-color-invokeGray-6) 50%, var(--mantine-color-invokeGray-7) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        borderRadius: radius,
    };

    return (
        <Box
            style={{
                width,
                height,
                backgroundColor: 'var(--mantine-color-invokeGray-8)',
                borderRadius: radius,
                border: '1px solid var(--mantine-color-invokeGray-6)',
                overflow: 'hidden',
                padding: 12,
            }}
        >
            <Stack gap="sm">
                {/* Image placeholder */}
                {showImage && (
                    <Box
                        style={{
                            ...shimmerStyle,
                            height: imageHeight,
                            width: '100%',
                        }}
                    />
                )}

                {/* Text line placeholders */}
                {Array.from({ length: textLines }).map((_, index) => (
                    <Box
                        key={index}
                        style={{
                            ...shimmerStyle,
                            height: 12,
                            width: index === 0 ? '80%' : '60%',
                        }}
                    />
                ))}

                {/* Optional action buttons placeholder */}
                <Group gap="xs" mt="xs">
                    <Box
                        style={{
                            ...shimmerStyle,
                            height: 24,
                            width: 60,
                        }}
                    />
                    <Box
                        style={{
                            ...shimmerStyle,
                            height: 24,
                            width: 24,
                            borderRadius: 4,
                        }}
                    />
                </Group>
            </Stack>
        </Box>
    );
});

/**
 * Grid of skeleton cards for loading lists
 */
export const SkeletonGrid = memo(function SkeletonGrid({
    count = 6,
    columns = 3,
    imageHeight = 120,
}: {
    count?: number;
    columns?: number;
    imageHeight?: number;
}) {
    return (
        <Box
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: 16,
            }}
        >
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonCard key={index} imageHeight={imageHeight} />
            ))}
        </Box>
    );
});

SkeletonCard.displayName = 'SkeletonCard';
SkeletonGrid.displayName = 'SkeletonGrid';
