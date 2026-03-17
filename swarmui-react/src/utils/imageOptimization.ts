/**
 * Image optimization utilities for better performance.
 */

/**
 * Check if browser supports WebP format
 */
export function supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
}

// Cache the WebP support check
let webPSupported: boolean | null = null;

/**
 * Get cached WebP support status
 */
export function isWebPSupported(): boolean {
    if (webPSupported === null) {
        webPSupported = supportsWebP();
    }
    return webPSupported;
}

/**
 * Get optimized image URL, requesting WebP when supported
 */
export function getOptimizedImageUrl(url: string): string {
    // If already WebP or not a recognized format, return as-is
    if (url.endsWith('.webp') || !url.match(/\.(png|jpg|jpeg|gif)$/i)) {
        return url;
    }

    // Note: This assumes the server can serve WebP alternatives
    // SwarmUI would need to support this on the backend
    if (isWebPSupported()) {
        // Replace extension with .webp if server supports it
        // For now, return original URL as SwarmUI may not support WebP conversion
        return url;
    }

    return url;
}

/**
 * Generate thumbnail URL for grid displays
 */
export function getThumbnailUrl(url: string, size: number = 256): string {
    // If URL supports size parameter, append it
    // SwarmUI uses View/local/{path} format
    if (url.includes('/View/')) {
        // Check if URL already has query params
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}maxWidth=${size}&maxHeight=${size}`;
    }
    return url;
}

/**
 * Preload an image and return a promise that resolves when loaded
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

/**
 * Preload multiple images in parallel
 */
export function preloadImages(srcs: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(srcs.map(preloadImage));
}

/**
 * Get natural aspect ratio from image dimensions
 */
export function getAspectRatio(width: number, height: number): string {
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    return `${width / divisor}/${height / divisor}`;
}

/**
 * Calculate dimensions to fit within a max size while preserving aspect ratio
 */
export function fitDimensions(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number
): { width: number; height: number } {
    const aspectRatio = width / height;

    if (width > maxWidth) {
        width = maxWidth;
        height = width / aspectRatio;
    }

    if (height > maxHeight) {
        height = maxHeight;
        width = height * aspectRatio;
    }

    return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Generate a simple color placeholder based on image URL
 * (Deterministic hash-based color)
 */
export function getPlaceholderColor(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    // Generate muted color
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 20%, 25%)`;
}

/**
 * Image loading priority levels
 */
export type ImagePriority = 'high' | 'low' | 'auto';

/**
 * Get fetchpriority attribute value based on visibility
 */
export function getImageFetchPriority(
    isVisible: boolean,
    index: number
): ImagePriority {
    // First few visible images get high priority
    if (isVisible && index < 6) {
        return 'high';
    }
    // Visible but not first few
    if (isVisible) {
        return 'auto';
    }
    // Not visible - low priority
    return 'low';
}
