import { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Box, Skeleton } from '@mantine/core';
import { decode } from 'blurhash';

interface LazyImageProps {
    /** Image source URL */
    src: string;
    /** Alt text for accessibility */
    alt: string;
    /** Image height */
    height?: number | string;
    /** Image width */
    width?: number | string;
    /** Object-fit style */
    fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
    /** Border radius */
    radius?: string | number;
    /** Intersection observer root margin (load earlier) */
    rootMargin?: string;
    /** Intersection observer threshold */
    threshold?: number;
    /** Optional className */
    className?: string;
    /** Optional style override */
    style?: React.CSSProperties;
    /** Called when image loads */
    onLoad?: () => void;
    /** Called on error */
    onError?: () => void;
    /** Optional BlurHash string for placeholder */
    blurhash?: string;
}

// Cache for decoded blurhash data URLs
const blurhashCache = new Map<string, string>();

/**
 * Decode a blurhash string to a data URL (32x32 canvas)
 */
function decodeBlurhashToDataUrl(hash: string): string {
    if (blurhashCache.has(hash)) {
        return blurhashCache.get(hash)!;
    }

    try {
        const width = 32;
        const height = 32;
        const pixels = decode(hash, width, height);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) return '';

        const imageData = ctx.createImageData(width, height);
        imageData.data.set(pixels);
        ctx.putImageData(imageData, 0, 0);

        const dataUrl = canvas.toDataURL();
        blurhashCache.set(hash, dataUrl);
        return dataUrl;
    } catch {
        return '';
    }
}

/**
 * Lazy loading image component using Intersection Observer.
 * Only loads the image when it enters the viewport.
 * Shows BlurHash placeholder when available, otherwise skeleton.
 */
export const LazyImage = memo(function LazyImage({
    src,
    alt,
    height = 'auto',
    width = '100%',
    fit = 'cover',
    radius = 0,
    rootMargin = '100px',
    threshold = 0.1,
    className,
    style,
    onLoad,
    onError,
    blurhash,
}: LazyImageProps) {
    const [isInView, setIsInView] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Decode blurhash if provided
    const placeholderUrl = useMemo(() => {
        if (!blurhash) return '';
        return decodeBlurhashToDataUrl(blurhash);
    }, [blurhash]);

    // Set up Intersection Observer
    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.unobserve(element);
                    }
                });
            },
            {
                rootMargin,
                threshold,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [rootMargin, threshold]);

    // Reset on src change
    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
    }, [src]);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
        setIsLoaded(true);
        onError?.();
    };

    return (
        <Box
            ref={containerRef}
            className={className}
            style={{
                position: 'relative',
                width,
                height,
                overflow: 'hidden',
                borderRadius: radius,
                backgroundColor: 'var(--mantine-color-invokeGray-8)',
                ...style,
            }}
        >
            {/* BlurHash placeholder - shows blurred preview */}
            {placeholderUrl && !isLoaded && (
                <img
                    src={placeholderUrl}
                    alt=""
                    aria-hidden="true"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: fit,
                        borderRadius: radius,
                        filter: 'blur(20px)',
                        transform: 'scale(1.1) translateZ(0)',
                        transition: 'opacity 200ms ease-out',
                        opacity: isLoaded ? 0 : 1,
                        // GPU acceleration for smooth crossfade
                        willChange: 'opacity, transform',
                    }}
                />
            )}

            {/* Skeleton fallback when no blurhash */}
            {!placeholderUrl && !isLoaded && (
                <Skeleton
                    visible
                    width="100%"
                    height="100%"
                    animate
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                    }}
                />
            )}

            {/* Actual image - only start loading when in view */}
            {isInView && !hasError && (
                <img
                    src={src}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: fit,
                        borderRadius: radius,
                        opacity: isLoaded ? 1 : 0,
                        transition: 'opacity 200ms ease-out',
                        // GPU acceleration for smooth fade-in
                        transform: 'translateZ(0)',
                        willChange: 'opacity',
                    }}
                    loading="lazy"
                    decoding="async"
                />
            )}

            {/* Error fallback */}
            {hasError && (
                <Box
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--mantine-color-invokeGray-7)',
                        color: 'var(--mantine-color-invokeGray-4)',
                        fontSize: 12,
                    }}
                >
                    Failed to load
                </Box>
            )}
        </Box>
    );
});

LazyImage.displayName = 'LazyImage';

